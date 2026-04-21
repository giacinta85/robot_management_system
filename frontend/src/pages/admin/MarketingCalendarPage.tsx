import { useEffect, useRef, useState } from 'react'
import { Button, DatePicker, Descriptions, Divider, Form, Input, Modal, Popconfirm, Select, Space, Spin, Tag, message } from 'antd'
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import FullCalendar from '@fullcalendar/react'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import { marketingApi, maintenanceApi } from '../../api'

const statusLabel: Record<string, string> = { pending: '待审批', approved: '已批准', rejected: '已拒绝', completed: '已完成' }
const statusColor: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red', completed: 'default' }
const sourceLabel: Record<string, string> = { existing: '使用已有', custom: '需要定制' }

export default function MarketingCalendarPage() {
  const calendarRef = useRef<any>(null)
  const [resources, setResources] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [detailReq, setDetailReq] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [detailMaint, setDetailMaint] = useState<any>(null)
  const [maintOpen, setMaintOpen] = useState(false)
  const [maintEditOpen, setMaintEditOpen] = useState(false)
  const [maintActionLoading, setMaintActionLoading] = useState(false)
  const [maintForm] = Form.useForm()

  const load = async () => {
    if (!calendarRef.current) return
    const api = calendarRef.current.getApi()
    const start = api.view.activeStart
    const end = api.view.activeEnd
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    setLoading(true)
    try {
      const res = await marketingApi.getAvailability(fmt(start), fmt(end))
      setResources(res.data.resources)
      setEvents(res.data.events)
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = async (info: any) => {
    const requestId = info.event.extendedProps?.request_id
    const maintId = info.event.extendedProps?.maintenance_id
    if (requestId) {
      try {
        const res = await marketingApi.getRequest(requestId)
        setDetailReq(res.data)
        setDetailOpen(true)
      } catch {
        // ignore
      }
    } else if (maintId) {
      try {
        const res = await maintenanceApi.get(maintId)
        setDetailMaint(res.data)
        setMaintOpen(true)
      } catch {
        // ignore
      }
    }
  }

  const handleMaintDelete = async () => {
    if (!detailMaint) return
    setMaintActionLoading(true)
    try {
      await maintenanceApi.delete(detailMaint.id)
      message.success('维修记录已删除')
      setMaintOpen(false)
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '删除失败')
    } finally {
      setMaintActionLoading(false)
    }
  }

  const openMaintEdit = () => {
    if (!detailMaint) return
    maintForm.setFieldsValue({
      damage_date: detailMaint.damage_date ? dayjs(detailMaint.damage_date) : null,
      location: detailMaint.location,
      damage_cause: detailMaint.damage_cause,
      damage_description: detailMaint.damage_description,
      repair_start_date: detailMaint.repair_start_date ? dayjs(detailMaint.repair_start_date) : null,
      repair_end_date: detailMaint.repair_end_date ? dayjs(detailMaint.repair_end_date) : null,
      repair_detail: detailMaint.repair_detail,
      is_resolved: detailMaint.is_resolved,
    })
    setMaintEditOpen(true)
  }

  const handleMaintEditSave = async (values: any) => {
    if (!detailMaint) return
    setMaintActionLoading(true)
    try {
      await maintenanceApi.update(detailMaint.id, {
        damage_date: values.damage_date?.format('YYYY-MM-DD'),
        location: values.location || null,
        damage_cause: values.damage_cause,
        damage_description: values.damage_description,
        repair_start_date: values.repair_start_date?.format('YYYY-MM-DD') ?? null,
        repair_end_date: values.repair_end_date?.format('YYYY-MM-DD') ?? null,
        repair_detail: values.repair_detail || null,
        is_resolved: values.is_resolved,
      })
      message.success('维修记录已更新')
      setMaintEditOpen(false)
      setMaintOpen(false)
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '更新失败')
    } finally {
      setMaintActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!detailReq) return
    setActionLoading(true)
    try {
      await marketingApi.reviewRequest(detailReq.id, { status: 'rejected' })
      message.success('已关闭/拒绝')
      setDetailOpen(false)
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!detailReq) return
    setActionLoading(true)
    try {
      await marketingApi.deleteRequest(detailReq.id)
      message.success('已删除')
      setDetailOpen(false)
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '删除失败')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>可用性看板</h2>
        <Button onClick={load}>刷新</Button>
      </Space>

      <div style={{ padding: '8px', background: '#fff', borderRadius: 8 }}>
        <Space style={{ marginBottom: 8 }} wrap>
          <span style={{ fontWeight: 500, color: '#666' }}>图例：</span>
          {[
            { color: '#ff4d4f', label: '维修中（红）' },
            { color: '#b7b7b7', label: '已修复（灰）' },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: color, display: 'inline-block' }} />
              {label}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: 'linear-gradient(90deg,#1677ff,#722ed1,#13c2c2)', display: 'inline-block' }} />
            市场项目（按项目区分颜色，可点击查看详情）
          </span>
        </Space>

        <Spin spinning={loading}>
          <style>{`
            .fc-day-past .fc-timeline-slot-lane { background: rgba(0,0,0,0.03) !important; }
            .fc-day-today .fc-timeline-slot-lane { background: rgba(255,220,0,0.12) !important; }
            .fc-day-today.fc-timeline-slot-label { background: rgba(255,220,0,0.2) !important; font-weight: bold; color: #d48806 !important; }
            .fc-timeline-slot-label.fc-day-today > div { color: #d48806; font-weight: bold; }
          `}</style>
          <FullCalendar
            ref={calendarRef}
            plugins={[resourceTimelinePlugin, interactionPlugin]}
            initialView="resourceTimelineMonth"
            schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
            resources={resources}
            events={events}
            nowIndicator={true}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: '',
            }}
            slotLabelContent={(arg) => String(arg.date.getDate())}
            resourceAreaHeaderContent="机器"
            resourceAreaWidth="200px"
            height="auto"
            locale="zh-cn"
            slotMinWidth={30}
            eventMinWidth={60}
            datesSet={load}
            eventClick={handleEventClick}
            eventContent={(arg) => {
              const title = arg.event.title
              return (
                <div
                  title={title}
                  style={{
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    padding: '0 4px',
                    fontSize: 12,
                    lineHeight: '20px',
                    height: '100%',
                    fontWeight: 500,
                  }}
                >
                  {title}
                </div>
              )
            }}
            eventDidMount={(info) => {
              if (info.event.extendedProps?.request_id || info.event.extendedProps?.maintenance_id) {
                info.el.style.cursor = 'pointer'
              }
            }}
          />
        </Spin>
      </div>

      <Modal
        title="市场申请详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={
          detailReq && (
            <Space>
              {detailReq.status !== 'rejected' && (
                <Popconfirm
                  title="确认关闭/拒绝此申请？"
                  onConfirm={handleReject}
                  okText="确认"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<CloseOutlined />} loading={actionLoading}>
                    关闭申请
                  </Button>
                </Popconfirm>
              )}
              <Popconfirm
                title="确认删除此申请？此操作不可恢复。"
                onConfirm={handleDelete}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />} loading={actionLoading}>
                  删除
                </Button>
              </Popconfirm>
              <Button onClick={() => setDetailOpen(false)}>关闭</Button>
            </Space>
          )
        }
        width={640}
      >
        {detailReq && (
          <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="申请人">{detailReq.requester_name}</Descriptions.Item>
              <Descriptions.Item label="联系方式">{detailReq.requester_contact || '-'}</Descriptions.Item>
              <Descriptions.Item label="活动名称" span={2}>{detailReq.event_name}</Descriptions.Item>
              <Descriptions.Item label="活动地点" span={2}>{detailReq.location}</Descriptions.Item>
              <Descriptions.Item label="使用日期">{detailReq.start_date} ~ {detailReq.end_date}</Descriptions.Item>
              <Descriptions.Item label="需要数量"><Tag color="blue">{detailReq.quantity_needed} 台</Tag></Descriptions.Item>
              {detailReq.machine_model && (
                <Descriptions.Item label="机器型号"><Tag color="purple">{detailReq.machine_model}</Tag></Descriptions.Item>
              )}
              <Descriptions.Item label="状态">
                <Tag color={statusColor[detailReq.status]}>{statusLabel[detailReq.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">{detailReq.created_at?.slice(0, 10)}</Descriptions.Item>
              {detailReq.notes && <Descriptions.Item label="备注" span={2}>{detailReq.notes}</Descriptions.Item>}
            </Descriptions>

            <Divider orientation="left" style={{ marginTop: 12 }}>技术需求</Divider>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="遥操作">
                <Tag color={detailReq.remote_operation_needed ? 'blue' : 'default'}>
                  {detailReq.remote_operation_needed ? '需要' : '不需要'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="群控">
                <Tag color={detailReq.group_control_needed ? 'blue' : 'default'}>
                  {detailReq.group_control_needed ? '需要' : '不需要'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="舞蹈需求">
                {detailReq.dance_needed ? (
                  <Space wrap>
                    <Tag color="purple">需要</Tag>
                    {detailReq.dance_source && <Tag>{sourceLabel[detailReq.dance_source] || detailReq.dance_source}</Tag>}
                  </Space>
                ) : <Tag color="default">不需要</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="语音需求">
                {detailReq.voice_needed ? (
                  <Space wrap>
                    <Tag color="cyan">有</Tag>
                    {detailReq.voice_source && <Tag>{sourceLabel[detailReq.voice_source] || detailReq.voice_source}</Tag>}
                  </Space>
                ) : <Tag color="default">无</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="动作需求" span={2}>
                {detailReq.motion_needed ? (
                  <Space wrap>
                    <Tag color="orange">有</Tag>
                    {detailReq.motion_source && <Tag>{sourceLabel[detailReq.motion_source] || detailReq.motion_source}</Tag>}
                  </Space>
                ) : <Tag color="default">无</Tag>}
              </Descriptions.Item>
              {detailReq.custom_requirements && (
                <Descriptions.Item label="定制需求" span={2}>{detailReq.custom_requirements}</Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}
      </Modal>

      {/* 维修记录详情 Modal */}
      <Modal
        title="维修记录详情"
        open={maintOpen}
        onCancel={() => setMaintOpen(false)}
        footer={
          detailMaint && (
            <Space>
              <Button icon={<EditOutlined />} onClick={openMaintEdit}>编辑</Button>
              <Popconfirm
                title="确认删除此维修记录？"
                onConfirm={handleMaintDelete}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />} loading={maintActionLoading}>删除</Button>
              </Popconfirm>
              <Button onClick={() => setMaintOpen(false)}>关闭</Button>
            </Space>
          )
        }
        width={520}
      >
        {detailMaint && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="损坏日期">{detailMaint.damage_date}</Descriptions.Item>
            <Descriptions.Item label="地点">{detailMaint.location || '-'}</Descriptions.Item>
            <Descriptions.Item label="损坏原因" span={2}>{detailMaint.damage_cause}</Descriptions.Item>
            <Descriptions.Item label="损坏描述" span={2}>{detailMaint.damage_description}</Descriptions.Item>
            <Descriptions.Item label="维修开始">{detailMaint.repair_start_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="维修结束">{detailMaint.repair_end_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="维修详情" span={2}>{detailMaint.repair_detail || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>
              <Tag color={detailMaint.is_resolved ? 'default' : 'red'}>
                {detailMaint.is_resolved ? '已修复' : '维修中'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 维修记录编辑 Modal */}
      <Modal
        title="编辑维修记录"
        open={maintEditOpen}
        onCancel={() => setMaintEditOpen(false)}
        footer={null}
        width={520}
      >
        <Form form={maintForm} layout="vertical" onFinish={handleMaintEditSave}>
          <Form.Item label="损坏日期" name="damage_date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="地点" name="location">
            <Input placeholder="城市/现场" />
          </Form.Item>
          <Form.Item label="损坏原因" name="damage_cause" rules={[{ required: true }]}>
            <Input placeholder="摔落/碰撞/电路故障..." />
          </Form.Item>
          <Form.Item label="损坏描述" name="damage_description" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="维修开始日期" name="repair_start_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="维修结束日期" name="repair_end_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="维修详情" name="repair_detail">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="状态" name="is_resolved" rules={[{ required: true }]}>
            <Select options={[
              { value: false, label: '维修中' },
              { value: true, label: '已修复' },
            ]} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={maintActionLoading} block>保存</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
