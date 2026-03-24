import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Vibration,
  Dimensions,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

const MESSAGES = [
  'מנסה להתחבר למרכזייה',
  'בודק זמינות נציגים',
  'מאתר נציג פנוי',
  'כמעט מחברים אותך',
];

const { width: SCREEN_W } = Dimensions.get('window');
const PHASE = { CONNECTING: 'connecting', SUCCESS: 'success' };

export default function WaitingScreen({ route, navigation }) {
  const { company, service } = route.params;

  const countdownStart = useRef(Math.floor(Math.random() * 16) + 5).current;
  const [phase, setPhase] = useState(PHASE.CONNECTING);
  const [countdown, setCountdown] = useState(countdownStart);
  const [isUrgent, setIsUrgent] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [showButton, setShowButton] = useState(false);

  // ── Animated values ──────────────────────────────────────────────
  const ringRotation   = useRef(new Animated.Value(0)).current;
  const ringScale      = useRef(new Animated.Value(1)).current;
  const timerScale     = useRef(new Animated.Value(1)).current;
  const msgSlide       = useRef(new Animated.Value(0)).current;
  const msgOpacity     = useRef(new Animated.Value(1)).current;
  const progressWidth  = useRef(new Animated.Value(0)).current;  // 0–1
  const cardScale      = useRef(new Animated.Value(1)).current;
  const cardColorAnim  = useRef(new Animated.Value(0)).current;  // 0=normal, 1=urgent
  const flashOpacity   = useRef(new Animated.Value(0)).current;
  const successScale   = useRef(new Animated.Value(0.3)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity     = useRef(new Animated.Value(0)).current;
  const btnTranslateY  = useRef(new Animated.Value(32)).current;
  const dotPulse       = useRef(new Animated.Value(1)).current;

  const accentColor = isUrgent ? colors.success : company.color;

  // ── Spinning ring ────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== PHASE.CONNECTING) return;
    const spin = Animated.loop(
      Animated.timing(ringRotation, { toValue: 1, duration: 2000, useNativeDriver: true })
    );
    spin.start();
    return () => spin.stop();
  }, [phase]);

  // ── Ring pulse (faster when urgent) ─────────────────────────────
  useEffect(() => {
    if (phase !== PHASE.CONNECTING) return;
    const dur = isUrgent ? 280 : 1000;
    const to  = isUrgent ? 1.12 : 1.06;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, { toValue: to, duration: dur, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1,  duration: dur, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => { pulse.stop(); ringScale.setValue(1); };
  }, [isUrgent, phase]);

  // ── Live dot pulse ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== PHASE.CONNECTING) return;
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 0.25, duration: 550, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1,    duration: 550, useNativeDriver: true }),
      ])
    );
    p.start();
    return () => p.stop();
  }, [phase]);

  // ── Progress bar (non-native driver, width %) ────────────────────
  useEffect(() => {
    if (phase !== PHASE.CONNECTING) return;
    const elapsed = countdownStart - countdown;
    const target  = elapsed / countdownStart;
    Animated.timing(progressWidth, {
      toValue: target,
      duration: 850,
      useNativeDriver: false,
    }).start();
  }, [countdown, phase]);

  // ── Message rotation every 2 s ───────────────────────────────────
  useEffect(() => {
    if (phase !== PHASE.CONNECTING || isUrgent) return;
    const id = setInterval(() => {
      // Slide + fade out
      Animated.parallel([
        Animated.timing(msgOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(msgSlide,   { toValue: 20, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        setMsgIndex(i => (i + 1) % MESSAGES.length);
        msgSlide.setValue(-20);
        // Slide + fade in from other side
        Animated.parallel([
          Animated.timing(msgOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(msgSlide,   { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start();
      });
    }, 2000);
    return () => clearInterval(id);
  }, [phase, isUrgent]);

  // ── Urgent transition ────────────────────────────────────────────
  useEffect(() => {
    if (!isUrgent) return;
    // Card bumps on urgent
    Animated.sequence([
      Animated.spring(cardScale, { toValue: 1.04, friction: 4, tension: 200, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1,    friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
    Animated.timing(cardColorAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
  }, [isUrgent]);

  // ── Countdown tick ───────────────────────────────────────────────
  const triggerSuccess = useCallback(() => {
    Vibration.vibrate([0, 160, 80, 320]);

    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 1, duration: 60,  useNativeDriver: true }),
      Animated.delay(110),
      Animated.timing(flashOpacity, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      setPhase(PHASE.SUCCESS);
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1, friction: 2.8, tension: 180, useNativeDriver: true,
        }),
        Animated.timing(successOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        setShowButton(true);
        Animated.parallel([
          Animated.timing(btnOpacity,     { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(btnTranslateY,  { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
        ]).start();
      }, 1500);
    }, 160);
  }, []);

  useEffect(() => {
    if (phase !== PHASE.CONNECTING) return;
    const id = setInterval(() => {
      setCountdown(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(id);
          triggerSuccess();
          return 0;
        }
        if (next <= 3 && !isUrgent) setIsUrgent(true);
        Animated.sequence([
          Animated.timing(timerScale, { toValue: 1.25, duration: 70,  useNativeDriver: true }),
          Animated.timing(timerScale, { toValue: 1,    duration: 200, useNativeDriver: true }),
        ]).start();
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, triggerSuccess]);

  const spinInterp = ringRotation.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '360deg'],
  });

  const cardBg = cardColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [company.color, colors.success],
  });

  const progressFill = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const currentMsg = isUrgent ? 'נציג נמצא! ✓' : MESSAGES[msgIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* White flash overlay */}
      <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flashOpacity }]} />

      {/* ── CONNECTING ── */}
      {phase === PHASE.CONNECTING && (
        <View style={styles.screen}>

          {/* Header: company identity */}
          <View style={styles.header}>
            <View style={[styles.companyChip, { borderColor: accentColor + '60' }]}>
              <Text style={styles.companyIcon}>{company.icon}</Text>
              <Text style={[styles.companyName, { color: accentColor }]}>
                {company.name}
              </Text>
              <Text style={styles.serviceName}> · {service.name}</Text>
            </View>
          </View>

          {/* Big page title */}
          <Text style={styles.pageTitle}>מחבר אותך לנציג...</Text>

          {/* Timer ring */}
          <View style={styles.timerBlock}>
            <Animated.View style={[styles.timerRingWrap, { transform: [{ scale: ringScale }] }]}>
              {/* Track */}
              <View style={[styles.trackRing, { borderColor: accentColor + '22' }]} />
              {/* Spinning arc */}
              <Animated.View style={[
                styles.arcRing,
                {
                  borderTopColor: accentColor,
                  borderRightColor: accentColor + '55',
                  transform: [{ rotate: spinInterp }],
                },
              ]} />
              {/* Number */}
              <View style={styles.timerCenter}>
                <Animated.Text style={[
                  styles.timerNumber,
                  { color: accentColor, transform: [{ scale: timerScale }] },
                ]}>
                  {countdown}
                </Animated.Text>
                <Text style={[styles.timerLabel, { color: accentColor + 'BB' }]}>שניות</Text>
              </View>
            </Animated.View>
          </View>

          {/* ── STATUS CARD ── */}
          <Animated.View style={[
            styles.statusCard,
            { backgroundColor: cardBg, transform: [{ scale: cardScale }] },
          ]}>
            {/* Live indicator row */}
            <View style={styles.cardTopRow}>
              <Animated.View style={[styles.liveDot, { opacity: dotPulse }]} />
              <Text style={styles.cardLiveLabel}>חיבור פעיל</Text>
            </View>

            {/* Dynamic message */}
            <Animated.Text style={[
              styles.cardMessage,
              { opacity: msgOpacity, transform: [{ translateX: msgSlide }] },
            ]}>
              {currentMsg}
            </Animated.Text>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressFill }]} />
            </View>

            {/* Step dots */}
            <View style={styles.stepDots}>
              {MESSAGES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.stepDot,
                    (isUrgent || i <= msgIndex) && styles.stepDotActive,
                  ]}
                />
              ))}
            </View>
          </Animated.View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>אתה בתור — אין צורך להמתין על הקו</Text>
        </View>
      )}

      {/* ── SUCCESS ── */}
      {phase === PHASE.SUCCESS && (
        <View style={styles.screen}>
          <Animated.View style={[
            styles.successContainer,
            { opacity: successOpacity, transform: [{ scale: successScale }] },
          ]}>
            <View style={styles.successRing}>
              <Text style={styles.successEmoji}>🎉</Text>
            </View>

            <Text style={styles.successTitle}>נציג זמין עכשיו!</Text>
            <Text style={styles.successSub}>{company.name} מחכה לך בקו</Text>

            {showButton && (
              <Animated.View style={[
                styles.btnBlock,
                { opacity: btnOpacity, transform: [{ translateY: btnTranslateY }] },
              ]}>
                <TouchableOpacity
                  style={styles.answerBtn}
                  onPress={() => navigation.popToTop()}
                  activeOpacity={0.83}
                >
                  <Text style={styles.answerBtnText}>📞  ענה לשיחה</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => navigation.popToTop()}
                  activeOpacity={0.6}
                >
                  <Text style={styles.backLinkText}>חזור לבחירת חברה</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const RING_SIZE = 190;
const INNER_SIZE = 138;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 99,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  // ── Header ──
  header: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  companyChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    gap: spacing.xs,
  },
  companyIcon: {
    fontSize: 17,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '700',
  },
  serviceName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },

  // ── Title ──
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing.xl,
  },

  // ── Timer ring ──
  timerBlock: {
    marginBottom: spacing.xl,
  },
  timerRingWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 6,
  },
  arcRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 6,
    borderColor: 'transparent',
  },
  timerCenter: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  timerNumber: {
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 80,
    letterSpacing: -3,
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -6,
    letterSpacing: 0.5,
  },

  // ── Status card ──
  statusCard: {
    width: '100%',
    borderRadius: radius.xl,
    paddingVertical: spacing.lg + spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  cardTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  cardLiveLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  cardMessage: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'right',
    marginBottom: spacing.lg,
    lineHeight: 30,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
    // RTL: flip so fill grows right-to-left
    transform: [{ scaleX: -1 }],
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.full,
  },
  stepDots: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  stepDotActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 20,
  },

  // ── Subtitle ──
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // ── Success ──
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  successRing: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: '#1E293B',
    borderWidth: 3,
    borderColor: colors.success + '60',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  successEmoji: {
    fontSize: 66,
  },
  successTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  successSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  btnBlock: {
    width: '100%',
    alignItems: 'center',
  },
  answerBtn: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: 52,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  answerBtnText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  backLink: {
    paddingVertical: spacing.sm,
  },
  backLinkText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    textDecorationLine: 'underline',
  },
});
