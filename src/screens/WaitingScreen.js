import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Vibration,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { getCompanyContent } from '../data/companyContent';

// Non-linear queue progress: slow start, fast near end
function easeQueueProgress(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 0.98;
  if (t < 0.7) {
    // Sub-linear first 70% — queue moves slowly
    return 0.65 * Math.pow(t / 0.7, 1.5);
  }
  // Super-linear last 30% — queue accelerates
  return 0.65 + 0.33 * Math.pow((t - 0.7) / 0.3, 0.6);
}

function getPhaseIndex(phases, elapsed) {
  let idx = 0;
  for (let i = 0; i < phases.length; i++) {
    if (elapsed >= phases[i].from) idx = i;
  }
  return idx;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ProgressRing({ progress, color, size = 160, strokeWidth = 10 }) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color + '25',
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderBottomColor: 'transparent',
          borderLeftColor: progress > 0.75 ? color : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }}
      />
    </View>
  );
}

const STATUS = {
  WAITING: 'waiting',
  ALMOST: 'almost',
  PAUSED: 'paused',
  DONE: 'done',
};

export default function WaitingScreen({ route, navigation }) {
  const { company, service } = route.params;
  const { phases, tips } = getCompanyContent(company.category);

  // Random wait between 10–25 min, stable for this session
  const initialEstimateMinRef = useRef(Math.floor(Math.random() * 16) + 10);
  const estimatedSeconds = initialEstimateMinRef.current * 60;

  const [status, setStatus] = useState(STATUS.WAITING);
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [displayedPhase, setDisplayedPhase] = useState(phases[0]);
  const [displayedEstimate, setDisplayedEstimate] = useState(initialEstimateMinRef.current);
  const [queueProgress, setQueueProgress] = useState(0);
  const intervalRef = useRef(null);
  const tipIntervalRef = useRef(null);
  const alertFiredRef = useRef(false);
  const prevPhaseIndexRef = useRef(0);
  const prevEstimateRef = useRef(initialEstimateMinRef.current);
  const queueJitterRef = useRef(0);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const queueFadeAnim = useRef(new Animated.Value(1)).current;
  const queueSlideAnim = useRef(new Animated.Value(0)).current;
  const estimateFadeAnim = useRef(new Animated.Value(1)).current;
  const progressBarAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const alertScaleAnim = useRef(new Animated.Value(0.8)).current;
  const alertOpacityAnim = useRef(new Animated.Value(0)).current;
  const alertPulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse dot loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Queue phase transitions driven by elapsed
  useEffect(() => {
    const idx = getPhaseIndex(phases, elapsed);
    if (idx !== prevPhaseIndexRef.current) {
      prevPhaseIndexRef.current = idx;
      // Fade + slide out, swap text, fade + slide in
      Animated.parallel([
        Animated.timing(queueFadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(queueSlideAnim, { toValue: -8, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        setDisplayedPhase(phases[idx]);
        queueSlideAnim.setValue(10);
        Animated.parallel([
          Animated.timing(queueFadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(queueSlideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start();
      });
    }
  }, [elapsed]);

  // Dynamic estimate: recalculate every 15 s while active
  useEffect(() => {
    const isActive = status === STATUS.WAITING || status === STATUS.ALMOST;
    if (!isActive || elapsed === 0 || elapsed % 15 !== 0) return;

    const baseDecrease = Math.floor(elapsed / 60);
    const jitterPool = [-1, 0, 0, 1];
    const jitter = jitterPool[Math.floor(Math.random() * jitterPool.length)];
    const next = Math.max(1, initialEstimateMinRef.current - baseDecrease + jitter);

    if (next !== prevEstimateRef.current) {
      prevEstimateRef.current = next;
      Animated.sequence([
        Animated.timing(estimateFadeAnim, { toValue: 0.2, duration: 200, useNativeDriver: true }),
        Animated.timing(estimateFadeAnim, { toValue: 1,   duration: 350, useNativeDriver: true }),
      ]).start();
      setDisplayedEstimate(next);
    }
  }, [elapsed]);

  // Queue progress: non-linear advance with jitter, triggers ALMOST at 85%
  useEffect(() => {
    const isActive = status === STATUS.WAITING || status === STATUS.ALMOST;
    if (!isActive) return;

    // Evolve jitter every 5 s: small random walk, slightly biased slow
    if (elapsed % 5 === 0 && elapsed > 0) {
      const delta = (Math.random() - 0.35) * 0.025;
      queueJitterRef.current = Math.max(-0.07, Math.min(0.07, queueJitterRef.current + delta));
    }

    const t = elapsed / estimatedSeconds;
    const raw = Math.max(0, Math.min(0.98, easeQueueProgress(t) + queueJitterRef.current));

    setQueueProgress(raw);
    Animated.timing(progressBarAnim, {
      toValue: raw,
      duration: 900,
      useNativeDriver: false,
    }).start();

    // Trigger ALMOST once progress hits 85%
    if (raw >= 0.85 && !alertFiredRef.current && status === STATUS.WAITING) {
      alertFiredRef.current = true;
      setTimeout(triggerAlert, 0);
    }
  }, [elapsed]);

  // Alert banner pulse loop (runs while ALMOST)
  useEffect(() => {
    if (status === STATUS.ALMOST) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(alertPulseAnim, { toValue: 0.6, duration: 500, useNativeDriver: true }),
          Animated.timing(alertPulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      alertPulseAnim.stopAnimation();
      alertPulseAnim.setValue(1);
    }
  }, [status]);

  const triggerAlert = () => {
    // Vibrate: short-short-long pattern for urgency
    Vibration.vibrate([0, 300, 120, 300, 120, 600]);

    setStatus(STATUS.ALMOST);

    // Flash red overlay: in → hold → out
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(200),
      Animated.timing(flashAnim, { toValue: 0.6, duration: 100, useNativeDriver: true }),
      Animated.delay(100),
      Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.delay(200),
      Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    // Alert card: slide + scale in
    Animated.parallel([
      Animated.spring(alertScaleAnim, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.timing(alertOpacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      // Shake after it appears
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    });
  };

  const dismissAlert = () => {
    Animated.parallel([
      Animated.timing(alertOpacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(alertScaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStatus(STATUS.WAITING);
    });
  };

  // Timer tick
  useEffect(() => {
    const isActive = status === STATUS.WAITING || status === STATUS.ALMOST;
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;

          if (next >= estimatedSeconds) {
            setStatus(STATUS.DONE);
            clearInterval(intervalRef.current);
            return estimatedSeconds;
          }
          return next;
        });
      }, 1000);

      tipIntervalRef.current = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % tips.length);
      }, 8000);
    } else {
      clearInterval(intervalRef.current);
      clearInterval(tipIntervalRef.current);
    }

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(tipIntervalRef.current);
    };
  }, [status]);

  const handlePause = () => setStatus(STATUS.PAUSED);
  const handleResume = () => setStatus(STATUS.WAITING);
  const handleReset = () => {
    // Re-randomise estimate for the new session
    const newEstimate = Math.floor(Math.random() * 16) + 10;
    initialEstimateMinRef.current = newEstimate;
    prevEstimateRef.current = newEstimate;

    alertFiredRef.current = false;
    prevPhaseIndexRef.current = 0;
    queueJitterRef.current = 0;
    alertOpacityAnim.setValue(0);
    alertScaleAnim.setValue(0.8);
    queueFadeAnim.setValue(1);
    queueSlideAnim.setValue(0);
    estimateFadeAnim.setValue(1);
    progressBarAnim.setValue(0);
    setQueueProgress(0);
    setDisplayedEstimate(newEstimate);
    setDisplayedPhase(phases[0]);
    setStatus(STATUS.WAITING);
    setElapsed(0);
  };

  const remaining = Math.max(0, estimatedSeconds - elapsed);
  const progress = elapsed / estimatedSeconds;

  const getStatusLabel = () => {
    switch (status) {
      case STATUS.WAITING: return 'ממתין לנציג...';
      case STATUS.ALMOST: return 'כמעט נציג';
      case STATUS.PAUSED: return 'הפסקה';
      case STATUS.DONE: return 'הגיע הזמן! 🎉';
      default: return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case STATUS.WAITING: return company.color;
      case STATUS.ALMOST: return colors.danger;
      case STATUS.PAUSED: return colors.warning;
      case STATUS.DONE: return colors.success;
      default: return colors.text;
    }
  };

  const ringColor = status === STATUS.DONE
    ? colors.success
    : status === STATUS.ALMOST
      ? colors.danger
      : company.color;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Full-screen flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, { opacity: flashAnim }]}
      />

      {/* Company identity header */}
      <View style={[styles.companyHeader, { borderRightColor: company.color }]}>
        <View style={styles.companyHeaderMain}>
          <Text style={styles.companyHeaderIcon}>{company.icon}</Text>
          <View style={styles.companyHeaderText}>
            <Text style={[styles.companyHeaderName, { color: company.color }]}>
              {company.name}
            </Text>
            <Text style={styles.companyHeaderService}>{service.name}</Text>
          </View>
        </View>
        <View style={[styles.companyHeaderBar, { backgroundColor: company.color }]} />
      </View>

      {/* Timer section */}
      <View style={styles.timerSection}>
        <View style={styles.ringWrapper}>
          <ProgressRing progress={progress} color={ringColor} size={200} strokeWidth={12} />
          <View style={styles.timerContent}>
            {status === STATUS.DONE ? (
              <Text style={styles.doneEmoji}>🎉</Text>
            ) : (
              <>
                <Text style={styles.timerLabel}>נותר</Text>
                <Text style={[styles.timerValue, { color: status === STATUS.PAUSED ? colors.warning : ringColor }]}>
                  {formatTime(remaining)}
                </Text>
                <Text style={styles.timerSub}>מתוך {initialEstimateMinRef.current} דק׳</Text>
              </>
            )}
          </View>
        </View>

        {status === STATUS.WAITING ? (
          <Animated.View
            style={[
              styles.queuePhaseRow,
              {
                opacity: queueFadeAnim,
                transform: [{ translateY: queueSlideAnim }],
              },
            ]}
          >
            <Text style={styles.queuePhaseIcon}>{displayedPhase.icon}</Text>
            <Text style={styles.queuePhaseText}>{displayedPhase.message}</Text>
          </Animated.View>
        ) : (
          <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
        )}

        {/* Live elapsed time */}
        {status !== STATUS.DONE && (
          <View style={[
            styles.elapsedBanner,
            status === STATUS.ALMOST && styles.elapsedBannerAlert,
          ]}>
            {(status === STATUS.WAITING || status === STATUS.ALMOST) && (
              <Animated.View style={[
                styles.pulseDot,
                { opacity: pulseAnim, backgroundColor: status === STATUS.ALMOST ? colors.danger : company.color },
              ]} />
            )}
            <Text style={[
              styles.elapsedLabel,
              status === STATUS.ALMOST && { color: colors.danger },
            ]}>
              {`זמן המתנה: ${formatTime(elapsed)}`}
            </Text>
          </View>
        )}

        {/* Dynamic estimate card */}
        {status !== STATUS.DONE && (
          <Animated.View style={[styles.estimateCard, { opacity: estimateFadeAnim }]}>
            <Text style={styles.estimateLabel}>
              {'זמן המתנה משוער: '}
              <Text style={[styles.estimateValue, { color: company.color }]}>
                {`${displayedEstimate} דקות`}
              </Text>
            </Text>
          </Animated.View>
        )}

        {/* Queue progress bar */}
        {status !== STATUS.DONE && (
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>התקדמות בתור</Text>
              <Text style={[styles.progressPct, {
                color: status === STATUS.ALMOST ? colors.danger : company.color,
              }]}>
                {`${Math.round(queueProgress * 100)}%`}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              {/* scaleX(-1) makes the fill grow right-to-left (RTL natural) */}
              <View style={styles.progressTrackInner}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressBarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: status === STATUS.ALMOST ? colors.danger : company.color,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatTime(remaining)}</Text>
            <Text style={styles.statLabel}>נותר</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Animated.Text style={[styles.statValue, { opacity: estimateFadeAnim }]}>
              {displayedEstimate}
            </Animated.Text>
            <Text style={styles.statLabel}>הערכה נוכחית</Text>
          </View>
        </View>
      </View>

      {/* Alert banner */}
      {(status === STATUS.ALMOST) && (
        <Animated.View
          style={[
            styles.alertCard,
            {
              opacity: alertOpacityAnim,
              transform: [
                { scale: alertScaleAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          <Animated.View style={[styles.alertIconWrapper, { opacity: alertPulseAnim }]}>
            <Text style={styles.alertIcon}>📞</Text>
          </Animated.View>
          <Text style={styles.alertTitle}>נציג עומד לענות</Text>
          <Text style={styles.alertMessage}>חזור לשיחה!</Text>
          <TouchableOpacity
            style={styles.alertButton}
            onPress={dismissAlert}
            activeOpacity={0.8}
          >
            <Text style={styles.alertButtonText}>הבנתי, חוזר לשיחה</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {(status === STATUS.WAITING || status === STATUS.ALMOST) && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handlePause}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>השהה</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.success, flex: 1 }]}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>סיים</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === STATUS.PAUSED && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>אפס</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: company.color, flex: 1 }]}
              onPress={handleResume}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>המשך</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === STATUS.DONE && (
          <View style={styles.doneActions}>
            <Text style={styles.doneMessage}>
              זמן ההמתנה המשוער הסתיים — הנציג אמור לענות עכשיו!
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: company.color }]}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>המתנה נוספת</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tip card */}
      {status === STATUS.WAITING && (
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>טיפ שימושי</Text>
          <Text style={styles.tipText}>{tips[tipIndex]}</Text>
        </View>
      )}

      {/* Back to start */}
      <TouchableOpacity
        style={styles.backLink}
        onPress={() => navigation.popToTop()}
        activeOpacity={0.6}
      >
        <Text style={styles.backLinkText}>חזור לבחירת חברה</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.danger,
    zIndex: 10,
  },
  companyHeader: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderRightWidth: 4,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  companyHeaderMain: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  companyHeaderIcon: {
    fontSize: 32,
    marginLeft: spacing.md,
  },
  companyHeaderText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  companyHeaderName: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'right',
  },
  companyHeaderService: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  companyHeaderBar: {
    height: 3,
    width: '100%',
  },
  timerSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  ringWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  timerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  timerValue: {
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 50,
    textAlign: 'center',
  },
  timerSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  doneEmoji: {
    fontSize: 52,
  },
  queuePhaseRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  queuePhaseIcon: {
    fontSize: 18,
  },
  queuePhaseText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  statusLabel: {
    ...typography.bodyMedium,
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  elapsedBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  elapsedBannerAlert: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: colors.danger + '60',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  elapsedLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  progressSection: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  progressLabelRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    ...typography.smallMedium,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  progressPct: {
    ...typography.smallMedium,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
    // Flip horizontally so fill grows from right (RTL)
    transform: [{ scaleX: -1 }],
  },
  progressTrackInner: {
    flex: 1,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  estimateCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  estimateLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  estimateValue: {
    fontWeight: '700',
    fontSize: 17,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginHorizontal: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  alertCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.danger,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  alertIconWrapper: {
    marginBottom: spacing.sm,
  },
  alertIcon: {
    fontSize: 40,
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  alertMessage: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  alertButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  alertButtonText: {
    ...typography.bodyMedium,
    color: colors.danger,
    fontWeight: '700',
    textAlign: 'center',
  },
  controls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  secondaryButtonText: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  buttonRow: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
  },
  doneActions: {
    alignItems: 'center',
    gap: spacing.md,
  },
  doneMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  tipCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderRightWidth: 4,
    borderRightColor: colors.primary,
  },
  tipTitle: {
    ...typography.smallMedium,
    color: colors.primary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  tipText: {
    ...typography.small,
    color: colors.text,
    textAlign: 'right',
    lineHeight: 22,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: 'auto',
  },
  backLinkText: {
    ...typography.small,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
