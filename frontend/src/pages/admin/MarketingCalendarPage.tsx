import { useEffect, useRef, useState } from 'react'
import { DatePicker, Button, Space, Spin } from 'antd'
import FullCalendar from '@fullcalendar/react'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import dayjs from 'dayjs'
import { marketingApi } from '../../api'

const { RangePicker } = DatePicker

export default function MarketingCalendarPage() {
  const calendarRef = useRef<any>(null)
  const [resources, setResources] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ])

  const load = async ([start, end]: [dayjs.Dayjs, dayjs.Dayjs]) => {
    setLoading(true)
    try {
      const res = await marketingApi.getAvailability(
        start.format('YYYY-MM-DD'),
        end.format('YYYY-MM-DD')
      )
      setResources(res.data.resources)
      setEvents(res.data.events)
      if (calendarRef.current) {
        const api = calendarRef.current.getApi()
        api.gotoDate(start.toDate())
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(range) }, [])

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>可用性看板</h2>
        <RangePicker
          value={range}
          onChange={(v) => { if (v?.[0] && v?.[1]) { setRange([v[0], v[1]]); load([v[0], v[1]]) } }}
        />
        <Button onClick={() => load(range)}>刷新</Button>
      </Space>

      <div style={{ padding: '8px', background: '#fff', borderRadius: 8 }}>
        <Space style={{ marginBottom: 8 }}>
          {[
            { color: '#1677ff', label: '市场' },
            { color: '#52c41a', label: '研发' },
            { color: '#fa8c16', label: '测试' },
            { color: '#ff4d4f', label: '维修中' },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: color, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </Space>

        <Spin spinning={loading}>
          <FullCalendar
            ref={calendarRef}
            plugins={[resourceTimelinePlugin, interactionPlugin]}
            initialView="resourceTimelineMonth"
            schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
            resources={resources}
            events={events}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'resourceTimelineWeek,resourceTimelineMonth',
            }}
            views={{
              resourceTimelineWeek: { buttonText: '周视图', duration: { weeks: 1 } },
              resourceTimelineMonth: { buttonText: '月视图' },
            }}
            resourceAreaHeaderContent="机器"
            resourceAreaWidth="200px"
            height="auto"
            locale="zh-cn"
            slotMinWidth={30}
          />
        </Spin>
      </div>
    </div>
  )
}
