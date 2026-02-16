import { arc, pie, PieArcDatum } from 'd3-shape';
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

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

function DonutChartBase({ data, total, size = 220, strokeWidth = 42 }: DonutChartProps) {
  const radius = size / 2;
  const innerRadius = Math.max(radius - strokeWidth, 0);

  const slices = useMemo(() => {
    const filtered = data.filter((item) => item.value > 0);
    const pieGenerator = pie<DonutDataItem>().value((item) => item.value).sort(null);
    return pieGenerator(filtered);
  }, [data]);

  const arcGenerator = useMemo(
    () => arc<PieArcDatum<DonutDataItem>>().outerRadius(radius).innerRadius(innerRadius),
    [innerRadius, radius]
  );

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G x={radius} y={radius}>
          <Circle r={radius} stroke="#E5E7EB" strokeWidth={strokeWidth} fill="none" />
          {slices.map((slice) => {
            const path = arcGenerator(slice);
            if (!path) return null;

            return <Path key={slice.data.label} d={path} fill={slice.data.color} />;
          })}
        </G>
      </Svg>

      <View pointerEvents="none" style={styles.centerContent}>
        <Text style={styles.centerLabel}>Итого</Text>
        <Text style={styles.centerTotal}>{total.toFixed(2)}</Text>
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
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  centerTotal: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
});
