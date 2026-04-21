import { useEffect, useState } from 'react'
import {
  Table, Tag, Button, message, Space, Descriptions, Card, Checkbox,
  Typography, Divider, Empty, Modal, Form, Input, InputNumber, DatePicker,
  Popconfirm, Select, Switch, Radio, Segmented, Alert,
} from 'antd'
import {
  CheckOutlined, CloseOutlined, ArrowLeftOutlined, EditOutlined,
  DeleteOutlined, UnorderedListOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { marketingApi, adminResourcesApi } from '../../api'

const statusColor: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red', completed: 'default' }
const statusLabel: Record<string, string> = { pending: '待审批', approved: '已批准', rejected: '已拒绝', completed: '已完成' }
const usageLabel: Record<string, string> = { motion_control: '运控', testing: '测试', software: '软件', marketing: '市场' }
const machineStatusLabel: Record<string, string> = { idle: '空闲', in_use: '使用中', under_repair: '维修中', retired: '已退役' }
const machineStatusColor: Record<string, string> = { idle: 'green', in_use: 'blue', under_repair: 'red', retired: 'default' }
const sourceLabel: Record<string, string> = { existing: '使用已有', custom: '需要定制' }

const { RangePicker } = DatePicker
const today = dayjs().format('YYYY-MM-DD')

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'not_started' | 'in_progress' | 'done'

function filterByStatus(records: any[], f: StatusFilter) {
  if (f === 'all') return records
  if (f === 'pending') return records.filter(r => r.status === 'pending')
  if (f === 'approved') return records.filter(r => r.status === 'approved')
  if (f === 'rejected') return records.filter(r => r.status === 'rejected')
  if (f === 'not_started') return records.filter(r => r.status === 'approved' && r.start_date > today)
  if (f === 'in_progress') return records.filter(r => r.status === 'approved' && r.start_date <= today && r.end_date >= today)
  if (f === 'done') return records.filter(r => r.status === 'completed' || (r.status === 'approved' && r.end_date < today))
  return records
}

export default function RequestListPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [idleMachines, setIdleMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [reviewing, setReviewing] = useState<any>(null)
  const [selectedMachines, setSelectedMachines] = useState<string[]>([])
  const [filterModel, setFilterModel] = useState<string | undefined>()
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editForm] = Form.useForm()
  const [dancePolicies, setDancePolicies] = useState<any[]>([])
  const [voicePackages, setVoicePackages] = useState<any[]>([])
  const [motionActions, setMotionActions] = useState<any[]>([])
  const [machineModels, setMachineModels] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [approving, setApproving] = useState(false)
  const [occupancyOpen, setOccupancyOpen] = useState(false)
  const [occupancyData, setOccupancyData] = useState<any[]>([])
  const [occupancyLoading, setOccupancyLoading] = useState(false)

  const editDanceNeeded = Form.useWatch('dance_needed', editForm)
  const editDanceSource = Form.useWatch('dance_source', editForm)
  const editVoiceNeeded = Form.useWatch('voice_needed', editForm)
  const editVoiceSource = Form.useWatch('voice_source', editForm)
  const editMotionNeeded = Form.useWatch('motion_needed', editForm)
  const editMotionSource = Form.useWatch('motion_source', editForm)
  const editQty = Form.useWatch('quantity_needed', editForm) || 1
  const editModel = Form.useWatch('machine_model', editForm)

  const filteredDance = editModel ? dancePolicies.filter(d => !d.machine_model || d.machine_model === editModel) : dancePolicies
  const filteredVoice = editModel ? voicePackages.filter(v => !v.machine_model || v.machine_model === editModel) : voicePackages
  const filteredMotion = editModel ? motionActions.filter(m => !m.machine_model || m.machine_model === editModel) : motionActions

  const load = async () => {
    setLoading(true)
    try {
      const [rRes, mRes, dRes, vRes, aRes, modRes] = await Promise.all([
        marketingApi.listRequests(),
        marketingApi.getIdleMachines(),
        adminResourcesApi.listDancePolicies(),
        adminResourcesApi.listVoicePackages(),
        adminResourcesApi.listMotionActions(),
        adminResourcesApi.listMachineModels(),
      ])
      setRequests(rRes.data)
      setIdleMachines(mRes.data)
      setDancePolicies(dRes.data)
      setVoicePackages(vRes.data)
      setMotionActions(aRes.data)
      setMachineModels(modRes.data.map((m: any) => m.name))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openOccupancy = async () => {
    setOccupancyOpen(true)
    setOccupancyLoading(true)
    try {
      const res = await marketingApi.getOccupancy()
      setOccupancyData(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setOccupancyLoading(false)
    }
  }

  const danceNamesById = (ids: string[]) =>
    (ids || []).map(id => dancePolicies.find(d => d.id === id)?.name || id)
  const voiceNamesById = (ids: string[]) =>
    (ids || []).map(id => voicePackages.find(v => v.id === id)?.name || id)
  const motionNamesById = (ids: string[]) =>
    (ids || []).map(id => motionActions.find(a => a.id === id)?.name || id)

  const onApprove = async () => {
    if (selectedMachines.length < reviewing.quantity_needed) {
      message.warning(`需要分配 ${reviewing.quantity_needed} 台机器，当前已选 ${selectedMachines.length} 台`)
      return
    }
    setApproving(true)
    try {
      await marketingApi.reviewRequest(reviewing.id, { status: 'approved', machine_ids: selectedMachines })
      message.success('已批准')
      setReviewing(null)
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '审批失败')
    } finally {
      setApproving(false)
    }
  }

  const onReject = async (id: string) => {
    try {
      await marketingApi.reviewRequest(id, { status: 'rejected' })
      message.success('已拒绝')
      setReviewing(null)
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '操作失败')
    }
  }

  const openEdit = (record: any) => {
    setEditTarget(record)
    const parsedDanceIds = record.dance_policy_ids
      ? (typeof record.dance_policy_ids === 'string' ? JSON.parse(record.dance_policy_ids) : record.dance_policy_ids)
      : (record.dance_policy_id ? [record.dance_policy_id] : [])
    const parsedVoiceIds = record.voice_package_ids
      ? (typeof record.voice_package_ids === 'string' ? JSON.parse(record.voice_package_ids) : record.voice_package_ids)
      : (record.voice_package_id ? [record.voice_package_id] : [])
    const parsedMotionIds = record.motion_action_ids
      ? (typeof record.motion_action_ids === 'string' ? JSON.parse(record.motion_action_ids) : record.motion_action_ids)
      : (record.motion_action_id ? [record.motion_action_id] : [])

    editForm.setFieldsValue({
      requester_name: record.requester_name,
      requester_contact: record.requester_contact,
      event_name: record.event_name,
      location: record.location,
      date_range: [dayjs(record.start_date), dayjs(record.end_date)],
      quantity_needed: record.quantity_needed,
      notes: record.notes,
      machine_model: record.machine_model || undefined,
      remote_operation_needed: record.remote_operation_needed || false,
      group_control_needed: record.group_control_needed || false,
      dance_needed: record.dance_needed || false,
      dance_source: record.dance_source || undefined,
      dance_policy_ids: parsedDanceIds,
      voice_needed: record.voice_needed || false,
      voice_source: record.voice_source || undefined,
      voice_package_ids: parsedVoiceIds,
      motion_needed: record.motion_needed || false,
      motion_source: record.motion_source || undefined,
      motion_action_ids: parsedMotionIds,
      custom_requirements: record.custom_requirements || undefined,
    })
  }

  const onEditSave = async (values: any) => {
    try {
      const [start, end] = values.date_range
      await marketingApi.updateRequest(editTarget.id, {
        requester_name: values.requester_name,
        requester_contact: values.requester_contact,
        event_name: values.event_name,
        location: values.location,
        start_date: start.format('YYYY-MM-DD'),
        end_date: end.format('YYYY-MM-DD'),
        quantity_needed: values.quantity_needed,
        notes: values.notes,
        machine_model: values.machine_model || null,
        remote_operation_needed: values.remote_operation_needed || false,
        group_control_needed: values.group_control_needed || false,
        dance_needed: values.dance_needed || false,
        dance_source: values.dance_needed ? values.dance_source : null,
        dance_policy_ids: values.dance_needed && values.dance_source === 'existing' ? (values.dance_policy_ids || []) : [],
        voice_needed: values.voice_needed || false,
        voice_source: values.voice_needed ? values.voice_source : null,
        voice_package_ids: values.voice_needed && values.voice_source === 'existing' ? (values.voice_package_ids || []) : [],
        motion_needed: values.motion_needed || false,
        motion_source: values.motion_needed ? values.motion_source : null,
        motion_action_ids: values.motion_needed && values.motion_source === 'existing' ? (values.motion_action_ids || []) : [],
        custom_requirements: values.custom_requirements || null,
      })
      message.success('已更新，申请状态已重置为「待审批」，请重新审批')
      setEditTarget(null)
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '更新失败')
    }
  }

  const onDelete = async (id: string) => {
    try {
      await marketingApi.deleteRequest(id)
      message.success('已删除')
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '删除失败')
    }
  }

  const displayRequests = filterByStatus(requests, statusFilter)

  const columns = [
    { title: '申请人', dataIndex: 'requester_name', width: 100 },
    { title: '联系方式', dataIndex: 'requester_contact', width: 120, render: (v: string) => v || '-' },
    { title: '活动', dataIndex: 'event_name', ellipsis: true },
    { title: '地点', dataIndex: 'location', ellipsis: true },
    { title: '机器型号', dataIndex: 'machine_model', width: 90, render: (v: string) => v ? <Tag color="purple">{v}</Tag> : '-' },
    { title: '日期', render: (_: any, r: any) => `${r.start_date} ~ ${r.end_date}`, width: 200 },
    { title: '数量', dataIndex: 'quantity_needed', width: 60 },
    { title: '状态', dataIndex: 'status', width: 90, render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag> },
    {
      title: '操作', width: 220,
      render: (_: any, record: any) => (
        <Space size={4}>
          {(record.status === 'pending' || record.status === 'rejected') && (
            <Button size="small" type="primary" icon={<CheckOutlined />}
              onClick={() => { setReviewing(record); setSelectedMachines([]); setFilterModel(record.machine_model || undefined) }}>
              {record.status === 'rejected' ? '重新审批' : '审批'}
            </Button>
          )}
          {record.status === 'pending' && (
            <Button size="small" danger icon={<CloseOutlined />} onClick={() => onReject(record.id)}>拒绝</Button>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="确认删除此申请？" onConfirm={() => onDelete(record.id)} okText="删除" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ── Review page ────────────────────────────────
  if (reviewing) {
    const availableModels = [...new Set(idleMachines.map((m: any) => m.model))].sort() as string[]
    const filteredMachines = filterModel
      ? idleMachines.filter((m: any) => m.model === filterModel)
      : idleMachines

    return (
      <div>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => setReviewing(null)}>返回列表</Button>
          <Button icon={<UnorderedListOutlined />} onClick={openOccupancy}>查看机器占用记录</Button>
        </Space>
        <Typography.Title level={4}>
          {reviewing.status === 'approved' ? '修改审批' : '审批申请'}
        </Typography.Title>

        <Card title="申请详情" style={{ marginBottom: 16 }}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="申请人">{reviewing.requester_name}</Descriptions.Item>
            <Descriptions.Item label="联系方式">{reviewing.requester_contact || '-'}</Descriptions.Item>
            <Descriptions.Item label="活动名称" span={2}>{reviewing.event_name}</Descriptions.Item>
            <Descriptions.Item label="活动地点" span={2}>{reviewing.location}</Descriptions.Item>
            <Descriptions.Item label="使用日期">{reviewing.start_date} ~ {reviewing.end_date}</Descriptions.Item>
            <Descriptions.Item label="需要数量"><Tag color="blue">{reviewing.quantity_needed} 台</Tag></Descriptions.Item>
            {reviewing.machine_model && (
              <Descriptions.Item label="需要机器型号"><Tag color="purple">{reviewing.machine_model}</Tag></Descriptions.Item>
            )}
            {reviewing.notes && <Descriptions.Item label="备注" span={2}>{reviewing.notes}</Descriptions.Item>}
          </Descriptions>

          <Divider orientation="left" style={{ marginTop: 16 }}>技术需求</Divider>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="遥操作">
              <Tag color={reviewing.remote_operation_needed ? 'blue' : 'default'}>
                {reviewing.remote_operation_needed ? '需要' : '不需要'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="群控">
              <Tag color={reviewing.group_control_needed ? 'blue' : 'default'}>
                {reviewing.group_control_needed ? '需要' : '不需要'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="舞蹈需求">
              {reviewing.dance_needed ? (
                <Space wrap>
                  <Tag color="purple">需要</Tag>
                  {reviewing.dance_source && <Tag>{sourceLabel[reviewing.dance_source] || reviewing.dance_source}</Tag>}
                  {(reviewing.dance_policy_ids || []).length > 0
                    ? danceNamesById(reviewing.dance_policy_ids).map((n: string) => <Tag key={n} color="geekblue">{n}</Tag>)
                    : reviewing.dance_policy_id ? <Tag color="geekblue">{dancePolicies.find(d => d.id === reviewing.dance_policy_id)?.name || reviewing.dance_policy_id}</Tag> : null}
                </Space>
              ) : <Tag color="default">不需要</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="语音需求">
              {reviewing.voice_needed ? (
                <Space wrap>
                  <Tag color="cyan">有</Tag>
                  {reviewing.voice_source && <Tag>{sourceLabel[reviewing.voice_source] || reviewing.voice_source}</Tag>}
                  {(reviewing.voice_package_ids || []).length > 0
                    ? voiceNamesById(reviewing.voice_package_ids).map((n: string) => <Tag key={n} color="geekblue">{n}</Tag>)
                    : reviewing.voice_package_id ? <Tag color="geekblue">{voicePackages.find(v => v.id === reviewing.voice_package_id)?.name || reviewing.voice_package_id}</Tag> : null}
                </Space>
              ) : <Tag color="default">无</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="动作需求" span={2}>
              {reviewing.motion_needed ? (
                <Space wrap>
                  <Tag color="orange">有</Tag>
                  {reviewing.motion_source && <Tag>{sourceLabel[reviewing.motion_source] || reviewing.motion_source}</Tag>}
                  {(reviewing.motion_action_ids || []).length > 0
                    ? motionNamesById(reviewing.motion_action_ids).map((n: string) => <Tag key={n} color="geekblue">{n}</Tag>)
                    : reviewing.motion_action_id ? <Tag color="geekblue">{motionActions.find(a => a.id === reviewing.motion_action_id)?.name || reviewing.motion_action_id}</Tag> : null}
                </Space>
              ) : <Tag color="default">无</Tag>}
            </Descriptions.Item>
            {reviewing.custom_requirements && (
              <Descriptions.Item label="定制需求描述" span={2}>{reviewing.custom_requirements}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card title={
          <span>
            选择分配的机器
            <Typography.Text type="secondary" style={{ marginLeft: 8, fontWeight: 'normal', fontSize: 13 }}>
              （仅显示用途为"市场"且当前空闲的机器，需选 {reviewing.quantity_needed} 台）
            </Typography.Text>
          </span>
        }>
          <Space style={{ marginBottom: 12 }}>
            <Select
              allowClear
              placeholder="按机器型号筛选"
              style={{ width: 180 }}
              value={filterModel}
              onChange={setFilterModel}
              options={availableModels.map(m => ({ value: m, label: m }))}
            />
            {filterModel && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                共 {filteredMachines.length} 台 {filterModel} 可用
              </Typography.Text>
            )}
          </Space>

          {filteredMachines.length === 0 ? (
            <Empty description={filterModel ? `暂无可用 ${filterModel} 型号市场机器` : '暂无可用市场机器'} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {filteredMachines.map((m: any) => (
                <Card
                  key={m.id}
                  size="small"
                  style={{
                    border: selectedMachines.includes(m.id) ? '2px solid #1677ff' : '1px solid #d9d9d9',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setSelectedMachines(prev =>
                      prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                    )
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Typography.Text strong>{m.serial_number}</Typography.Text>
                      <br />
                      <Typography.Text type="secondary">{m.model}</Typography.Text>
                    </div>
                    <Checkbox checked={selectedMachines.includes(m.id)} />
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <Space wrap>
                    <Tag color={machineStatusColor[m.status]}>{machineStatusLabel[m.status]}</Tag>
                    {m.usage_type && <Tag>{usageLabel[m.usage_type]}</Tag>}
                  </Space>
                  {(m.firmware_version || m.image_version) && (
                    <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>
                      {m.firmware_version && <div>固件：{m.firmware_version}</div>}
                      {m.image_version && <div>镜像：{m.image_version}</div>}
                    </div>
                  )}
                  {m.description && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#aaa' }}>{m.description}</div>
                  )}
                </Card>
              ))}
            </div>
          )}
          <Divider />
          <Space>
            <Typography.Text>
              已选 <Typography.Text strong>{selectedMachines.length}</Typography.Text> / {reviewing.quantity_needed} 台
            </Typography.Text>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={onApprove}
              loading={approving}
              disabled={selectedMachines.length < reviewing.quantity_needed}
            >
              确认批准并分配
            </Button>
            <Button danger onClick={() => onReject(reviewing.id)}>拒绝此申请</Button>
          </Space>
        </Card>

        <Modal
          title="机器占用记录（当前及未来）"
          open={occupancyOpen}
          onCancel={() => setOccupancyOpen(false)}
          footer={null}
          width={860}
        >
          <Table
            rowKey={(_, i) => String(i)}
            dataSource={occupancyData}
            loading={occupancyLoading}
            size="small"
            pagination={false}
            scroll={{ y: 480 }}
            columns={[
              { title: '机器编号', dataIndex: 'machine_serial', width: 110 },
              { title: '型号', dataIndex: 'machine_model', width: 90 },
              { title: '类型', dataIndex: 'type', width: 70, render: (v: string) =>
                  v === 'marketing' ? <Tag color="blue">市场</Tag> : <Tag>分配</Tag> },
              { title: '部门', dataIndex: 'department', width: 80 },
              { title: '项目 / 备注', render: (_: any, r: any) => r.project || r.notes || '-' },
              { title: '开始日期', dataIndex: 'start_date', width: 105 },
              { title: '结束日期', dataIndex: 'end_date', width: 105, render: (v: string) => v || '未定' },
            ]}
          />
        </Modal>
      </div>
    )
  }

  // ── List page ──────────────────────────────────
  return (
    <div>
      <Space style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>市场需求申请</h2>
        <Button icon={<UnorderedListOutlined />} onClick={openOccupancy}>查看机器占用记录</Button>
      </Space>

      <Segmented
        style={{ marginBottom: 16 }}
        value={statusFilter}
        onChange={v => setStatusFilter(v as StatusFilter)}
        options={[
          { label: `全部 (${requests.length})`, value: 'all' },
          { label: `待审批 (${requests.filter(r => r.status === 'pending').length})`, value: 'pending' },
          { label: `已批准 (${requests.filter(r => r.status === 'approved').length})`, value: 'approved' },
          { label: `已拒绝 (${requests.filter(r => r.status === 'rejected').length})`, value: 'rejected' },
          { label: `未开始 (${requests.filter(r => r.status === 'approved' && r.start_date > today).length})`, value: 'not_started' },
          { label: `进行中 (${requests.filter(r => r.status === 'approved' && r.start_date <= today && r.end_date >= today).length})`, value: 'in_progress' },
          { label: `已完成 (${requests.filter(r => r.status === 'completed' || (r.status === 'approved' && r.end_date < today)).length})`, value: 'done' },
        ]}
      />

      <Table dataSource={displayRequests} columns={columns} rowKey="id" loading={loading} scroll={{ x: true }} />

      <Modal title="编辑申请" open={!!editTarget} onCancel={() => setEditTarget(null)} footer={null} width={600}>
        <Alert
          type="warning"
          showIcon
          message="保存后申请状态将自动重置为「待审批」，原有审批记录（含机器分配）将清除，需重新审批。"
          style={{ marginBottom: 16 }}
        />
        <Form form={editForm} layout="vertical" onFinish={onEditSave}>
          <Form.Item label="申请人姓名" name="requester_name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="联系方式" name="requester_contact">
            <Input />
          </Form.Item>
          <Form.Item label="活动/项目名称" name="event_name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="使用地点" name="location" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="使用日期" name="date_range" rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="需要机器数量" name="quantity_needed" rules={[{ required: true }]}>
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="需要机器型号" name="machine_model">
            <Select allowClear placeholder="选择型号（可选）"
              options={machineModels.map(m => ({ value: m, label: m }))} />
          </Form.Item>

          <Divider orientation="left" style={{ fontSize: 13 }}>技术需求</Divider>

          <Form.Item label="是否需要遥操" name="remote_operation_needed" valuePropName="checked">
            <Switch checkedChildren="需要" unCheckedChildren="不需要" />
          </Form.Item>
          {editQty > 1 && (
            <Form.Item label="是否需要群控" name="group_control_needed" valuePropName="checked">
              <Switch checkedChildren="需要" unCheckedChildren="不需要" />
            </Form.Item>
          )}
          <Form.Item label="是否需要舞蹈" name="dance_needed" valuePropName="checked">
            <Switch checkedChildren="需要" unCheckedChildren="不需要" />
          </Form.Item>
          {editDanceNeeded && (
            <>
              <Form.Item label="舞蹈来源" name="dance_source" rules={[{ required: true, message: '请选择' }]}>
                <Radio.Group>
                  <Radio value="existing">使用已有</Radio>
                  <Radio value="custom">需要定制</Radio>
                </Radio.Group>
              </Form.Item>
              {editDanceSource === 'existing' && (
                <Form.Item label="选择舞蹈（可多选）" name="dance_policy_ids">
                  <Select mode="multiple" placeholder="选择舞蹈"
                    options={filteredDance.map(d => ({ value: d.id, label: d.name + (d.machine_model ? ` (${d.machine_model})` : '') }))} />
                </Form.Item>
              )}
            </>
          )}
          <Form.Item label="是否有语音需求" name="voice_needed" valuePropName="checked">
            <Switch checkedChildren="有" unCheckedChildren="无" />
          </Form.Item>
          {editVoiceNeeded && (
            <>
              <Form.Item label="语音来源" name="voice_source" rules={[{ required: true, message: '请选择' }]}>
                <Radio.Group>
                  <Radio value="existing">使用已有</Radio>
                  <Radio value="custom">需要定制</Radio>
                </Radio.Group>
              </Form.Item>
              {editVoiceSource === 'existing' && (
                <Form.Item label="选择语音包（可多选）" name="voice_package_ids">
                  <Select mode="multiple" placeholder="选择语音包"
                    options={filteredVoice.map(v => ({ value: v.id, label: v.name + (v.machine_model ? ` (${v.machine_model})` : '') }))} />
                </Form.Item>
              )}
            </>
          )}
          <Form.Item label="是否有动作需求" name="motion_needed" valuePropName="checked">
            <Switch checkedChildren="有" unCheckedChildren="无" />
          </Form.Item>
          {editMotionNeeded && (
            <>
              <Form.Item label="动作来源" name="motion_source" rules={[{ required: true, message: '请选择' }]}>
                <Radio.Group>
                  <Radio value="existing">使用已有</Radio>
                  <Radio value="custom">需要定制</Radio>
                </Radio.Group>
              </Form.Item>
              {editMotionSource === 'existing' && (
                <Form.Item label="选择动作（可多选）" name="motion_action_ids">
                  <Select mode="multiple" placeholder="选择动作"
                    options={filteredMotion.map(m => ({ value: m.id, label: m.name + (m.machine_model ? ` (${m.machine_model})` : '') }))} />
                </Form.Item>
              )}
            </>
          )}
          {(editDanceSource === 'custom' || editVoiceSource === 'custom' || editMotionSource === 'custom') && (
            <Form.Item label="定制需求描述" name="custom_requirements">
              <Input.TextArea rows={3} />
            </Form.Item>
          )}
          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>保存</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="机器占用记录（当前及未来）"
        open={occupancyOpen}
        onCancel={() => setOccupancyOpen(false)}
        footer={null}
        width={860}
      >
        <Table
          rowKey={(_, i) => String(i)}
          dataSource={occupancyData}
          loading={occupancyLoading}
          size="small"
          pagination={false}
          scroll={{ y: 480 }}
          columns={[
            { title: '机器编号', dataIndex: 'machine_serial', width: 110 },
            { title: '型号', dataIndex: 'machine_model', width: 90 },
            { title: '类型', dataIndex: 'type', width: 70, render: (v: string) =>
                v === 'marketing' ? <Tag color="blue">市场</Tag> : <Tag>分配</Tag> },
            { title: '部门', dataIndex: 'department', width: 80 },
            { title: '项目 / 备注', render: (_: any, r: any) => r.project || r.notes || '-' },
            { title: '开始日期', dataIndex: 'start_date', width: 105 },
            { title: '结束日期', dataIndex: 'end_date', width: 105, render: (v: string) => v || '未定' },
          ]}
        />
      </Modal>
    </div>
  )
}
