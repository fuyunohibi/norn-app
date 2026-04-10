import { BarChart3 } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Dimensions, PanResponder, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from "react-native-svg";
import { NornColors } from "@/theme";

const windowWidth = Dimensions.get("window").width;

export type ChartLabel = { key: string; weekday: string; day: string };

type LineChartProps = {
  values: number[];
  color: string;
  labels: ChartLabel[];
};

export function LineChart({ values, color, labels }: LineChartProps) {
  const chartWidth = useMemo(() => Math.max(windowWidth - 80, 260), []);
  const chartHeight = 120;
  const verticalPadding = 12;

  const chartData = useMemo(() => {
    const validValues = values.filter(
      (value) => typeof value === "number" && value >= 0 && !Number.isNaN(value),
    );

    if (validValues.length < 2) {
      return { points: [] as Array<{ x: number; y: number; value: number }>, linePath: "", areaPath: "" };
    }

    let previousValue = validValues[0];
    const safeValues = values.map((value) => {
      if (typeof value === "number" && value >= 0 && !Number.isNaN(value)) {
        previousValue = value;
        return value;
      }
      return previousValue;
    });

    const minValue = Math.min(...safeValues);
    const maxValue = Math.max(...safeValues);
    const range = maxValue - minValue || 1;
    const yRange = chartHeight - verticalPadding * 2;

    const points = safeValues.map((value, index) => {
      const x = safeValues.length === 1 ? chartWidth / 2 : (index / (safeValues.length - 1)) * chartWidth;
      const normalized = (value - minValue) / range;
      const y = chartHeight - verticalPadding - normalized * yRange;
      return { x, y, value };
    });

    const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;
    return { points, linePath, areaPath };
  }, [chartHeight, chartWidth, values]);

  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);

  const handleGesture = useCallback(
    (x: number) => {
      const { points } = chartData;
      if (!points.length) return;
      const clampedX = Math.max(0, Math.min(x, chartWidth));
      const index = Math.round((clampedX / chartWidth) * (points.length - 1));
      setTooltipIndex(index);
    },
    [chartData, chartWidth],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => chartData.points.length > 0,
        onMoveShouldSetPanResponder: () => chartData.points.length > 0,
        onPanResponderGrant: (evt) => handleGesture(evt.nativeEvent.locationX),
        onPanResponderMove: (evt) => handleGesture(evt.nativeEvent.locationX),
        onPanResponderRelease: () => setTooltipIndex(null),
        onPanResponderTerminate: () => setTooltipIndex(null),
      }),
    [chartData.points.length, handleGesture],
  );

  if (chartData.points.length < 2) {
    return (
      <View className="items-center justify-center rounded-2xl bg-orange-50/60 px-4 py-8">
        <BarChart3 size={28} color={NornColors.brandOrange} strokeWidth={2} />
        <Text className="mt-3 text-center text-sm font-hell text-gray-600">
          Not enough days with events to show a trend yet.
        </Text>
      </View>
    );
  }

  const areaGradId = "statsChartAreaFill";
  const activePoint = tooltipIndex != null ? chartData.points[tooltipIndex] : null;
  const activeLabel = tooltipIndex != null ? labels[tooltipIndex] : undefined;

  return (
    <View style={{ height: chartHeight + 40 + (activePoint ? 16 : 0) }}>
      {activePoint ? (
        <View className="absolute left-0 right-0 z-10 items-center" style={{ top: 0 }}>
          <View style={{ transform: [{ translateX: activePoint.x - chartWidth / 2 }] }}>
            <View className="rounded-2xl border border-white/15 bg-gray-900/95 px-3.5 py-2">
              <Text className="text-center text-xs font-hell-round-bold text-white">
                {activeLabel ? `${activeLabel.weekday} ${activeLabel.day} · ` : ""}
                {Math.round(activePoint.value * 10) / 10} events
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View {...panResponder.panHandlers} style={{ paddingTop: 20 }}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <SvgLinearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0.03} />
            </SvgLinearGradient>
          </Defs>
          <Rect x={0} y={0} width={chartWidth} height={chartHeight} fill="transparent" />
          <Path d={chartData.areaPath} fill={`url(#${areaGradId})`} />
          <Path d={chartData.linePath} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {chartData.points.map((point, index) => (
            <Circle key={index} cx={point.x} cy={point.y} r={5} fill="#ffffff" stroke={color} strokeWidth={2.5} />
          ))}
          {activePoint ? (
            <Path d={`M ${activePoint.x} 0 L ${activePoint.x} ${chartHeight}`} stroke={color} strokeWidth={1.5} strokeDasharray="4" />
          ) : null}
        </Svg>
      </View>
    </View>
  );
}
