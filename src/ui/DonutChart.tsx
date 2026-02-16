import { arc, pie, PieArcDatum } from 'd3-shape';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';

import { colors, spacing, typography } from '@/src/theme';

type DonutDataItem = {
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  data: DonutDataItem[];
  total: number;
  size?: number;
  strokeWidth?: number;
};

type TransitionState = {
  fromData: DonutDataItem[];
  toData: DonutDataItem[];
  fromTotal: number;
  toTotal: number;
};

const ANIMATION_DURATION = 300;

function areDataEqual(a: DonutDataItem[], b: DonutDataItem[]) {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].label !== b[i].label ||
      a[i].color !== b[i].color ||
      Math.abs(a[i].value - b[i].value) > 0.0001
    ) {
      return false;
    }
  }

  return true;
}

function interpolateData(fromData: DonutDataItem[], toData: DonutDataItem[], progress: number) {
  const fromMap = new Map(fromData.map((item) => [item.label, item]));
  const toMap = new Map(toData.map((item) => [item.label, item]));

  const labels = [...toData.map((item) => item.label)];
  fromData.forEach((item) => {
    if (!toMap.has(item.label)) {
      labels.push(item.label);
    }
  });

  return labels
    .map((label) => {
      const fromValue = fromMap.get(label)?.value ?? 0;
      const toValue = toMap.get(label)?.value ?? 0;
      const value = fromValue + (toValue - fromValue) * progress;
      const color = toMap.get(label)?.color ?? fromMap.get(label)?.color ?? colors.border;

      return { label, value, color };
    })
    .filter((item) => item.value > 0.001);
}

function DonutChartBase({ data, total, size = 220, strokeWidth = 42 }: DonutChartProps) {
  const radius = size / 2;
  const innerRadius = Math.max(radius - strokeWidth, 0);

  const progressValue = useSharedValue(1);
  const [renderProgress, setRenderProgress] = useState(1);
  const previousDataRef = useRef<DonutDataItem[]>(data);
  const previousTotalRef = useRef(total);
  const [transition, setTransition] = useState<TransitionState>({
    fromData: data,
    toData: data,
    fromTotal: total,
    toTotal: total,
  });

  const updateProgress = useCallback((value: number) => {
    setRenderProgress(value);
  }, []);

  useAnimatedReaction(
    () => progressValue.value,
    (value, previous) => {
      if (value !== previous) {
        runOnJS(updateProgress)(value);
      }
    },
    [updateProgress]
  );

  useEffect(() => {
    const hasDataChanged = !areDataEqual(previousDataRef.current, data);
    const hasTotalChanged = Math.abs(previousTotalRef.current - total) > 0.0001;

    if (!hasDataChanged && !hasTotalChanged) return;

    setTransition({
      fromData: previousDataRef.current,
      toData: data,
      fromTotal: previousTotalRef.current,
      toTotal: total,
    });

    setRenderProgress(0);
    progressValue.value = 0;
    progressValue.value = withTiming(1, {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    previousDataRef.current = data;
    previousTotalRef.current = total;
  }, [data, total, progressValue]);

  const interpolatedData = useMemo(
    () => interpolateData(transition.fromData, transition.toData, renderProgress),
    [renderProgress, transition]
  );

  const displayTotal =
    transition.fromTotal + (transition.toTotal - transition.fromTotal) * renderProgress;

  const slices = useMemo(() => {
    const pieGenerator = pie<DonutDataItem>()
      .value((item) => item.value)
      .sort(null)
      .padAngle(interpolatedData.length > 1 ? 0.012 : 0);

    return pieGenerator(interpolatedData);
  }, [interpolatedData]);

  const arcGenerator = useMemo(
    () =>
      arc<PieArcDatum<DonutDataItem>>()
        .outerRadius(radius)
        .innerRadius(innerRadius)
        .padRadius(radius)
        .cornerRadius(Math.min(strokeWidth / 2, 12)),
    [innerRadius, radius, strokeWidth]
  );

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G x={radius} y={radius}>
          {slices.map((slice) => {
            const path = arcGenerator(slice);
            if (!path) return null;

            return <Path key={slice.data.label} d={path} fill={slice.data.color} />;
          })}
        </G>
      </Svg>

      <View pointerEvents="none" style={styles.centerContent}>
        <Text style={styles.centerLabel}>Итого</Text>
        <Text style={styles.centerTotal}>
          {displayTotal.toLocaleString('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      </View>
    </View>
  );
}

export const DonutChart = memo(DonutChartBase);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  centerTotal: {
    ...typography.subtitle,
    marginTop: spacing.xs,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
