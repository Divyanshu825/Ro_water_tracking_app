import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { Button } from '../../../components/common/Button';
import { FilterChips } from '../../../components/common/Chips';
import { EmptyState } from '../../../components/common/EmptyState';
import { WaterLoader } from '../../../components/common/WaterLoader';
import { BarChart } from '../../../components/charts/BarChart';
import { AreaChart } from '../../../components/charts/AreaChart';
import { DonutChart, chartColors } from '../../../components/charts/DonutChart';
import { DatePickerSheet } from '../../../components/forms/DateField';
import { useFeedback } from '../../../components/common/Feedback';
import { useDb, useSettings } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useTheme } from '../../../theme';
import { RANGE_OPTIONS, RangeKey, resolveRange } from '../../dashboard/services/stats';
import { REPORTS, ReportKey, buildReport } from '../services/reportBuilder';
import { reportHtml, sharePdf, shareCsv } from '../../../services/export';
import { friendlyDate, todayStr } from '../../../utils/date';

export default function ReportsScreen() {
  const c = useTheme();
  const db = useDb();
  const settings = useSettings();
  const fb = useFeedback();
  const { money } = useFormat();
  const [key, setKey] = useState<ReportKey>('daily');
  const [rk, setRk] = useState<RangeKey>('30d');
  const [custom, setCustom] = useState(todayStr());
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState(false);
  const range = useMemo(() => resolveRange(rk, custom), [rk, custom]);
  const report = useMemo(() => buildReport(key, db, range, (n) => money(n)), [key, db, range, money]);
  const title = REPORTS.find((r) => r.value === key)!.label;
  const rangeLabel = rk === 'custom' ? friendlyDate(custom) : RANGE_OPTIONS.find((o) => o.value === rk)!.label;
  const colors = chartColors(c);
  const needsRange = !['weekly', 'monthly', 'inventory', 'outstanding', 'subscriptions'].includes(key);

  const pdf = async () => {
    setBusy(true);
    try { await sharePdf(reportHtml(title, settings.business.name, rangeLabel, report.head, report.rows), title); } catch { fb.error('Could not create the PDF.'); } finally { setBusy(false); }
  };
  const csv = async () => { try { await shareCsv(title.replace(/\W+/g, '-').toLowerCase(), [report.head, ...report.rows]); } catch { fb.error('Could not export the file.'); } };

  return (
    <Screen scroll header={<Header title="Reports" subtitle={needsRange ? rangeLabel : 'Live snapshot'} />}>
      <FilterChips pad={0} value={key} onChange={setKey} options={REPORTS} />
      {needsRange ? <FilterChips pad={0} value={rk} onChange={(v) => (v === 'custom' ? setPick(true) : setRk(v))} options={RANGE_OPTIONS.filter((o) => o.value !== 'yesterday')} /> : null}
      {report.summary ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {report.summary.map((s) => <Card key={s.label} pad={14} style={{ flex: 1 }}><AppText v="caption" color="textMuted">{s.label}</AppText><AppText v="h2">{s.value}</AppText></Card>)}
        </View>
      ) : null}
      {report.rows.length === 0 ? <Card><EmptyState title="No data" message="Nothing to report for this period. Try a wider date range." /></Card> : (
        <>
          {report.chart === 'area' && report.series ? <Card><AreaChart data={report.series} format={(n) => money(n)} title={title} /></Card> : null}
          {report.chart === 'bar' && report.series ? <Card><BarChart data={report.series} format={(n) => (key === 'returns' ? `${n}%` : ['delivery', 'inventory'].includes(key) ? String(n) : money(n, true))} title={title} /></Card> : null}
          {report.chart === 'donut' && report.segments ? <Card><DonutChart segments={report.segments.map((s, i) => ({ ...s, color: colors[i % colors.length] }))} /></Card> : null}
          <Card pad={4}>
            <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>{report.head.map((h, i) => <AppText key={h} v="overline" color="textMuted" style={{ flex: i === 0 ? 2 : 1, textAlign: i === 0 ? 'left' : 'right' }}>{h}</AppText>)}</View>
            {report.rows.slice(0, 80).map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: c.border }}>
                {row.map((cell, ci) => <AppText key={ci} v={ci === 0 ? 'bodyBold' : 'body'} style={{ flex: ci === 0 ? 2 : 1, textAlign: ci === 0 ? 'left' : 'right', fontSize: 13 }} numberOfLines={2}>{String(cell)}</AppText>)}
              </View>
            ))}
          </Card>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button title="Export PDF" icon="file-text" variant="soft" onPress={pdf} loading={busy} /></View>
            <View style={{ flex: 1 }}><Button title="Export Excel (CSV)" icon="download" variant="soft" onPress={csv} /></View>
          </View>
        </>
      )}
      {busy ? <WaterLoader size={60} label="Preparing PDF…" /> : null}
      <DatePickerSheet visible={pick} onClose={() => setPick(false)} value={custom} onPick={(d) => { setCustom(d); setRk('custom'); setPick(false); }} />
    </Screen>
  );
}
