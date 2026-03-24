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

const ALERT_THRESHOLD_SECONDS = 60;

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

const tips = [
  'כדאי להכין את מספר תעודת הזהות לפני שיעלה נציג',
  'רשום מראש את מספר החשבון שלך לתגובה מהירה',
  'נסה להתקשר בשעות הבוקר המוקדמות לזמן המתנה קצר יותר',
  'שמור על הקו פתוח ואל תנתק אפילו אם השמע נעצר',
  'אפשר לבקש מהנציג לחזור אליך אם הקו ניתק',
];

export default function WaitingScreen({ route, navigation }) {
  const { company, service } = route.params;
  const estimatedSeconds = service.estimatedWait * 60;

  const [status, setStatus] = useState(STATUS.WAITING);
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const intervalRef = useRef(null);
  const tipIntervalRef = useRef(null);
  const alertFiredRef = useRef(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
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

          // Fire alert once at threshold
          if (next === ALERT_THRESHOLD_SECONDS && !alertFiredRef.current) {
            alertFiredRef.current = true;
            // Use setTimeout to avoid setState-inside-setState
            setTimeout(triggerAlert, 0);
          }

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
    alertFiredRef.current = false;
    alertOpacityAnim.setValue(0);
    alertScaleAnim.setValue(0.8);
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

      {/* Header summary */}
      <View style={styles.header}>
        <View style={styles.summaryRow}>
          <View style={[styles.chip, { backgroundColor: company.color + '18' }]}>
            <Text style={styles.chipIcon}>{company.icon}</Text>
            <Text style={[styles.chipText, { color: company.color }]}>{company.name}</Text>
          </View>
          <View style={styles.dividerDot} />
          <Text style={styles.serviceText}>{service.name}</Text>
        </View>
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
                <Text style={styles.timerSub}>מתוך {service.estimatedWait} דק׳</Text>
              </>
            )}
          </View>
        </View>

        <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
          {getStatusLabel()}
        </Text>

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

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatTime(remaining)}</Text>
            <Text style={styles.statLabel}>נותר</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{service.estimatedWait}</Text>
            <Text style={styles.statLabel}>דקות משוערות</Text>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  chipIcon: {
    fontSize: 16,
    marginLeft: spacing.xs,
  },
  chipText: {
    ...typography.smallMedium,
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textLight,
    marginHorizontal: spacing.sm,
  },
  serviceText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'right',
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
