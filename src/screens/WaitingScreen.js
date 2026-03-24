import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

const PHASE = {
  CONNECTING: 'connecting',
  AGENT_READY: 'agent_ready',
  SUCCESS: 'success',
};

export default function WaitingScreen({ route, navigation }) {
  const { company, service } = route.params;

  const countdownRef = useRef(Math.floor(Math.random() * 16) + 5); // 5–20 s
  const [phase, setPhase] = useState(PHASE.CONNECTING);
  const [countdown, setCountdown] = useState(countdownRef.current);

  // Animated values
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentScale = useRef(new Animated.Value(1)).current;
  const timerScale = useRef(new Animated.Value(1)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.7)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;
  const agentReadyScale = useRef(new Animated.Value(0.85)).current;
  const agentReadyOpacity = useRef(new Animated.Value(0)).current;

  // Spinning ring during connecting phase
  useEffect(() => {
    if (phase !== PHASE.CONNECTING) return;
    const spin = Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [phase]);

  // Pulsing dot during connecting
  useEffect(() => {
    if (phase !== PHASE.CONNECTING) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [phase]);

  // Countdown tick
  useEffect(() => {
    if (phase !== PHASE.CONNECTING) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          transitionToAgentReady();
          return 0;
        }
        // Quick scale pop on each tick
        Animated.sequence([
          Animated.timing(timerScale, { toValue: 1.18, duration: 100, useNativeDriver: true }),
          Animated.timing(timerScale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  const crossFade = (callback) => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(contentScale, { toValue: 0.92, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      callback();
      contentScale.setValue(1.06);
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(contentScale, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();
    });
  };

  const transitionToAgentReady = () => {
    crossFade(() => setPhase(PHASE.AGENT_READY));

    // Animate agent-ready badge in
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(agentReadyScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
        Animated.timing(agentReadyOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }, 320);

    // Auto-advance to success after 2 s
    setTimeout(() => transitionToSuccess(), 2320);
  };

  const transitionToSuccess = () => {
    crossFade(() => setPhase(PHASE.SUCCESS));

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 320);
  };

  const spin = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderConnecting = () => (
    <Animated.View style={[styles.phaseContainer, { opacity: contentOpacity, transform: [{ scale: contentScale }] }]}>
      {/* Spinning ring + countdown */}
      <View style={styles.ringArea}>
        <Animated.View style={[styles.spinRing, { borderTopColor: company.color, transform: [{ rotate: spin }] }]} />
        <View style={[styles.ringInner, { borderColor: company.color + '20' }]}>
          <Animated.Text style={[styles.countdownNumber, { color: company.color, transform: [{ scale: timerScale }] }]}>
            {countdown}
          </Animated.Text>
          <Text style={styles.countdownSec}>שניות</Text>
        </View>
      </View>

      <Text style={styles.mainTitle}>מחבר אותך לנציג...</Text>

      <View style={styles.subtitleRow}>
        <Animated.View style={[styles.liveDot, { backgroundColor: company.color, opacity: dotPulse }]} />
        <Text style={styles.subtitle}>אתה בתור, אין צורך להמתין על הקו</Text>
      </View>

      {/* Company + service badge */}
      <View style={[styles.infoBadge, { borderColor: company.color + '30' }]}>
        <Text style={styles.infoBadgeText}>{company.icon} {company.name} · {service.name}</Text>
      </View>
    </Animated.View>
  );

  const renderAgentReady = () => (
    <Animated.View style={[styles.phaseContainer, { opacity: contentOpacity, transform: [{ scale: contentScale }] }]}>
      <Animated.View style={[styles.agentReadyCard, { opacity: agentReadyOpacity, transform: [{ scale: agentReadyScale }] }]}>
        <Text style={styles.agentReadyIcon}>📞</Text>
        <Text style={styles.agentReadyTitle}>נציג זמין עכשיו!</Text>
        <Text style={styles.agentReadySubtitle}>מחברים אותך לשיחה...</Text>
        <View style={styles.connectingDots}>
          <ConnectingDots color={colors.surface} />
        </View>
      </Animated.View>
    </Animated.View>
  );

  const renderSuccess = () => (
    <Animated.View style={[styles.phaseContainer, { opacity: contentOpacity, transform: [{ scale: contentScale }] }]}>
      <Animated.View style={[styles.successContainer, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
        <View style={[styles.successIconRing, { borderColor: colors.success + '40' }]}>
          <View style={[styles.successIconInner, { backgroundColor: colors.success + '15' }]}>
            <Text style={styles.successEmoji}>🎉</Text>
          </View>
        </View>
        <Text style={styles.successTitle}>השיחה מוכנה 🎉</Text>
        <Text style={styles.successSubtitle}>{company.name} מחכה לך</Text>
        <TouchableOpacity
          style={[styles.answerButton, { backgroundColor: colors.success }]}
          onPress={() => navigation.popToTop()}
          activeOpacity={0.85}
        >
          <Text style={styles.answerButtonText}>ענה לשיחה</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.popToTop()}
          activeOpacity={0.6}
        >
          <Text style={styles.backLinkText}>חזור לבחירת חברה</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.content}>
        {phase === PHASE.CONNECTING && renderConnecting()}
        {phase === PHASE.AGENT_READY && renderAgentReady()}
        {phase === PHASE.SUCCESS && renderSuccess()}
      </View>
    </SafeAreaView>
  );
}

function ConnectingDots({ color }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const makePulse = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ])
      );
    const a1 = makePulse(dot1, 0);
    const a2 = makePulse(dot2, 200);
    const a3 = makePulse(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={styles.dotsRow}>
      {[dot1, dot2, dot3].map((anim, i) => (
        <Animated.View key={i} style={[styles.dot, { backgroundColor: color, opacity: anim }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },

  // — Connecting phase —
  ringArea: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  spinRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 5,
    borderColor: 'transparent',
  },
  ringInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  countdownNumber: {
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 72,
  },
  countdownSec: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: -4,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    writingDirection: 'rtl',
  },
  subtitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  infoBadge: {
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  infoBadgeText: {
    ...typography.smallMedium,
    color: colors.text,
    textAlign: 'center',
  },

  // — Agent ready phase —
  agentReadyCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 14,
  },
  agentReadyIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  agentReadyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  agentReadySubtitle: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.80)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  connectingDots: {
    marginTop: spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // — Success phase —
  successContainer: {
    alignItems: 'center',
    width: '100%',
  },
  successIconRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successIconInner: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successEmoji: {
    fontSize: 58,
  },
  successTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  answerButton: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  answerButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
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
