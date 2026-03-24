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
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

const MESSAGES = [
  'מחפש נציג פנוי...',
  'מעדכן את המערכת...',
  'עוד רגע מחברים אותך...',
  'כמעט שם...',
];

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
  const ringScale    = useRef(new Animated.Value(1)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;
  const shakeX       = useRef(new Animated.Value(0)).current;
  const timerScale   = useRef(new Animated.Value(1)).current;
  const msgOpacity   = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.4)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity   = useRef(new Animated.Value(0)).current;
  const btnTranslateY = useRef(new Animated.Value(28)).current;
  const glowOpacity  = useRef(new Animated.Value(0)).current;

  const accentColor = isUrgent ? colors.success : company.color;

  // ── Ring pulse (fast when urgent) ────────────────────────────────
  useEffect(() => {
    if (phase !== PHASE.CONNECTING) return;
    const dur = isUrgent ? 300 : 1100;
    const scaleTo = isUrgent ? 1.13 : 1.07;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, { toValue: scaleTo, duration: dur, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1,       duration: dur, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => { pulse.stop(); ringScale.setValue(1); };
  }, [isUrgent, phase]);

  // ── Ring spin ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== PHASE.CONNECTING) return;
    const spin = Animated.loop(
      Animated.timing(ringRotation, { toValue: 1, duration: 1800, useNativeDriver: true })
    );
    spin.start();
    return () => spin.stop();
  }, [phase]);

  // ── Glow pulse when urgent ───────────────────────────────────────
  useEffect(() => {
    if (!isUrgent) { glowOpacity.setValue(0); return; }
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.6, duration: 350, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0,   duration: 350, useNativeDriver: true }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, [isUrgent]);

  // ── Visual shake every 4 s ───────────────────────────────────────
  useEffect(() => {
    if (phase !== PHASE.CONNECTING) return;
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(shakeX, { toValue:  9, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -9, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue:  6, duration: 45, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -6, duration: 45, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue:  3, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue:  0, duration: 40, useNativeDriver: true }),
      ]).start();
    }, 4000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Message rotation every 2.5 s (pauses when urgent) ───────────
  useEffect(() => {
    if (phase !== PHASE.CONNECTING || isUrgent) return;
    const id = setInterval(() => {
      Animated.timing(msgOpacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setMsgIndex(i => (i + 1) % MESSAGES.length);
        Animated.timing(msgOpacity, { toValue: 1, duration: 320, useNativeDriver: true }).start();
      });
    }, 2500);
    return () => clearInterval(id);
  }, [phase, isUrgent]);

  // ── Countdown tick ───────────────────────────────────────────────
  const triggerSuccess = useCallback(() => {
    // Strong vibration pattern
    Vibration.vibrate([0, 180, 80, 340]);

    // White flash
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 1, duration: 70,  useNativeDriver: true }),
      Animated.delay(100),
      Animated.timing(flashOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();

    // Switch phase and pop in success UI
    setTimeout(() => {
      setPhase(PHASE.SUCCESS);
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1, friction: 3, tension: 160, useNativeDriver: true,
        }),
        Animated.timing(successOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();

      // Button slides up after 1.5 s
      setTimeout(() => {
        setShowButton(true);
        Animated.parallel([
          Animated.timing(btnOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.spring(btnTranslateY, { toValue: 0, friction: 6, tension: 90, useNativeDriver: true }),
        ]).start();
      }, 1500);
    }, 170);
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

        // Tick pop
        Animated.sequence([
          Animated.timing(timerScale, { toValue: 1.22, duration: 75,  useNativeDriver: true }),
          Animated.timing(timerScale, { toValue: 1,    duration: 190, useNativeDriver: true }),
        ]).start();
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, triggerSuccess]);

  const spinInterp = ringRotation.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* White flash overlay */}
      <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flashOpacity }]} />

      <View style={styles.content}>

        {/* ── CONNECTING phase ── */}
        {phase === PHASE.CONNECTING && (
          <Animated.View style={[styles.phaseContainer, { transform: [{ translateX: shakeX }] }]}>

            {/* Ring */}
            <Animated.View style={[styles.ringArea, { transform: [{ scale: ringScale }] }]}>
              {/* Glow halo when urgent */}
              <Animated.View style={[
                styles.glowHalo,
                { backgroundColor: colors.success, opacity: glowOpacity },
              ]} />

              {/* Spinning arc */}
              <Animated.View style={[
                styles.spinArc,
                {
                  borderTopColor: accentColor,
                  borderRightColor: accentColor + '50',
                  transform: [{ rotate: spinInterp }],
                },
              ]} />

              {/* Static outer ring */}
              <View style={[styles.staticRing, { borderColor: accentColor + '18' }]} />

              {/* Inner circle */}
              <View style={[
                styles.ringInner,
                { shadowColor: accentColor },
                isUrgent && { borderColor: colors.success + '50', borderWidth: 2 },
              ]}>
                <Animated.Text style={[
                  styles.countdownNumber,
                  { color: accentColor, transform: [{ scale: timerScale }] },
                ]}>
                  {countdown}
                </Animated.Text>
                <Text style={[styles.countdownSec, isUrgent && { color: colors.success }]}>
                  שניות
                </Text>
              </View>
            </Animated.View>

            {/* Dynamic / urgent message */}
            <Animated.Text style={[
              styles.mainTitle,
              { opacity: isUrgent ? 1 : msgOpacity },
              isUrgent && styles.urgentTitle,
            ]}>
              {isUrgent ? 'נציג נמצא! 🟢' : MESSAGES[msgIndex]}
            </Animated.Text>

            <Text style={styles.subtitle}>אתה בתור, אין צורך להמתין על הקו</Text>

            {/* Company / service chip */}
            <View style={[styles.chip, { borderColor: accentColor + '40' }]}>
              <Text style={styles.chipText}>{company.icon}  {company.name} · {service.name}</Text>
            </View>
          </Animated.View>
        )}

        {/* ── SUCCESS phase ── */}
        {phase === PHASE.SUCCESS && (
          <Animated.View style={[
            styles.phaseContainer,
            styles.successContainer,
            { opacity: successOpacity, transform: [{ scale: successScale }] },
          ]}>
            {/* Big emoji burst */}
            <View style={styles.successEmojiWrap}>
              <Text style={styles.successEmoji}>🎉</Text>
            </View>

            <Text style={styles.successTitle}>נציג זמין עכשיו!</Text>
            <Text style={styles.successSubtitle}>{company.name} מחכה לך בקו</Text>

            {/* CTA button – delayed slide-up */}
            {showButton && (
              <Animated.View style={[
                styles.btnWrapper,
                { opacity: btnOpacity, transform: [{ translateY: btnTranslateY }] },
              ]}>
                <TouchableOpacity
                  style={styles.answerBtn}
                  onPress={() => navigation.popToTop()}
                  activeOpacity={0.82}
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
        )}
      </View>
    </SafeAreaView>
  );
}

const RING = 210;
const INNER = 156;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 99,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // — Shared —
  phaseContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },

  // — Connecting —
  ringArea: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl + spacing.sm,
  },
  glowHalo: {
    position: 'absolute',
    width: RING + 24,
    height: RING + 24,
    borderRadius: (RING + 24) / 2,
  },
  spinArc: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 5,
    borderColor: 'transparent',
  },
  staticRing: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 5,
  },
  ringInner: {
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  countdownNumber: {
    fontSize: 68,
    fontWeight: '800',
    lineHeight: 76,
    letterSpacing: -2,
  },
  countdownSec: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -6,
    letterSpacing: 0.4,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    writingDirection: 'rtl',
  },
  urgentTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.success,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  chipText: {
    ...typography.smallMedium,
    color: colors.text,
    textAlign: 'center',
  },

  // — Success —
  successContainer: {
    alignItems: 'center',
  },
  successEmojiWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  successEmoji: {
    fontSize: 64,
  },
  successTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  btnWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  answerBtn: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.xxl + spacing.md,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  answerBtnText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  backLink: {
    paddingVertical: spacing.sm,
  },
  backLinkText: {
    ...typography.small,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
