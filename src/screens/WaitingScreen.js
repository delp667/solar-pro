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

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ProgressRing({ progress, color, size = 160, strokeWidth = 10 }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background ring */}
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
      {/* Simple arc simulation using border */}
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
  IDLE: 'idle',
  WAITING: 'waiting',
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

  const [status, setStatus] = useState(STATUS.IDLE);
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const intervalRef = useRef(null);
  const tipIntervalRef = useRef(null);

  useEffect(() => {
    if (status === STATUS.WAITING) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= estimatedSeconds) {
            setStatus(STATUS.DONE);
            clearInterval(intervalRef.current);
            return estimatedSeconds;
          }
          return prev + 1;
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

  const handleStart = () => setStatus(STATUS.WAITING);
  const handlePause = () => setStatus(STATUS.PAUSED);
  const handleResume = () => setStatus(STATUS.WAITING);
  const handleReset = () => {
    setStatus(STATUS.IDLE);
    setElapsed(0);
  };

  const remaining = Math.max(0, estimatedSeconds - elapsed);
  const progress = elapsed / estimatedSeconds;

  const getStatusLabel = () => {
    switch (status) {
      case STATUS.IDLE: return 'מוכן להתחיל';
      case STATUS.WAITING: return 'ממתין לנציג...';
      case STATUS.PAUSED: return 'הפסקה';
      case STATUS.DONE: return 'הגיע הזמן! 🎉';
      default: return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case STATUS.IDLE: return colors.textSecondary;
      case STATUS.WAITING: return company.color;
      case STATUS.PAUSED: return colors.warning;
      case STATUS.DONE: return colors.success;
      default: return colors.text;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

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
          <ProgressRing
            progress={progress}
            color={status === STATUS.DONE ? colors.success : company.color}
            size={200}
            strokeWidth={12}
          />
          <View style={styles.timerContent}>
            {status === STATUS.DONE ? (
              <Text style={styles.doneEmoji}>🎉</Text>
            ) : (
              <>
                <Text style={styles.timerLabel}>נותר</Text>
                <Text style={[styles.timerValue, { color: company.color }]}>
                  {formatTime(remaining)}
                </Text>
                <Text style={styles.timerSub}>דקות</Text>
              </>
            )}
          </View>
        </View>

        <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
          {getStatusLabel()}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatTime(elapsed)}</Text>
            <Text style={styles.statLabel}>עברו</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{service.estimatedWait}</Text>
            <Text style={styles.statLabel}>דקות משוערות</Text>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {status === STATUS.IDLE && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: company.color }]}
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>התחל המתנה</Text>
          </TouchableOpacity>
        )}

        {status === STATUS.WAITING && (
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
  controls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
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
