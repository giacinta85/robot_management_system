import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tabs, Descriptions, Tag, Button, Table, Modal, Form, Input, Select, DatePicker, message, Space, Popconfirm } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { machinesApi, maintenanceApi, adminResourcesApi, testRecordsApi, marketingApi } from '../../api'
import { useAuthStore } from '../../store/auth'

const statusLabel: Record<string, string> = { idle: '空闲', in_use: '使用中', under_repair: '维修中', retired: '已退役' }
const statusColor: Record<string, string> = { idle: 'green', in_use: 'blue', under_repair: 'red', retired: 'default' }
const deptLabel: Record<string, string> = { rd: '研发', test: '测试', marketing: '市场' }
const usageLabel: Record<string, string> = { motion_control: '运控', testing: '测试', software: '软件', marketing: '市场' }
const testStatusLabel: Record<string, string> = { in_progress: '进行中', completed: '已完成', failed: '失败', paused: '暂停' }
const testStatusColor: Record<string, string> = { in_progress: 'blue', completed: 'green', failed: 'red', paused: 'orange' }
const mktStatusLabel: Record<string, string> = { pending: '待审批', approved: '已批准', rejected: '已拒绝', completed: '已完成' }
const mktStatusColor: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red', completed: 'default' }

export default function MachineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const role = useAuthStore(s => s.role)
  const [machine, setMachine] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [maintenances, setMaintenances] = useState<any[]>([])
  const [testRecords, setTestRecords] = useState<any[]>([])
  const [mktAllocations, setMktAllocations] = useState<any[]>([])
  const [maintOpen, setMaintOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [testDetailTarget, setTestDetailTarget] = useState<any>(null)
  const [testEditTarget, setTestEditTarget] = useState<any>(null)
  const [mktDetailTarget, setMktDetailTarget] = useState<any>(null)
  const [resourceLinks, setResourceLinks] = useState<any[]>([])
  const [resourceLinkOpen, setResourceLinkOpen] = useState(false)
  const [allMotorFirmware, setAllMotorFirmware] = useState<any[]>([])
  const [allPowerBoard, setAllPowerBoard] = useState<any[]>([])
  const [allSystemImage, setAllSystemImage] = useState<any[]>([])
  const [attrDefs, setAttrDefs] = useState<any[]>([])
  const [attrValues, setAttrValues] = useState<Record<string, string | null>>({})
  const [models, setModels] = useState<string[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [damageCauses, setDamageCauses] = useState<string[]>([])
  const [form] = Form.useForm()
  const [aForm] = Form.useForm()
  const [eForm] = Form.useForm()
  const [tForm] = Form.useForm()
  const [teForm] = Form.useForm()
  const [rlForm] = Form.useForm()

  const reload = () => {
    if (!id) return
    machinesApi.get(id).then((r) => setMachine(r.data))
    machinesApi.listAssignments(id).then((r) => setAssignments(r.data))
    maintenanceApi.list(id).then((r) => setMaintenances(r.data))
    testRecordsApi.list(id).then((r) => setTestRecords(r.data))
    marketingApi.getMachineAllocations(id).then((r: any) => setMktAllocations(r.data)).catch(() => {})
    machinesApi.listResourceLinks(id).then((r) => setResourceLinks(r.data)).catch(() => {})
    machinesApi.getAttributeValues(id).then((r) => setAttrValues(r.data.values ?? {})).catch(() => {})
  }

  useEffect(() => {
    reload()
    adminResourcesApi.listMachineModels().then(r => setModels(r.data.map((m: any) => m.name)))
    adminResourcesApi.listDepartments().then(r => setDepartments(r.data.map((d: any) => d.name)))
    adminResourcesApi.listDamageCausePresets().then(r => setDamageCauses(r.data.map((d: any) => d.name)))
    adminResourcesApi.listMotorFirmwareVersions().then(r => setAllMotorFirmware(r.data))
    adminResourcesApi.listPowerBoardVersions().then(r => setAllPowerBoard(r.data))
    adminResourcesApi.listSystemImageVersions().then(r => setAllSystemImage(r.data))
    adminResourcesApi.listAttributeDefinitions().then(r => setAttrDefs(r.data))
  }, [id])

  const onMaintSubmit = async (values: any) => {
    await maintenanceApi.create({
      ...values,
      machine_id: id,
      damage_date: values.damage_date?.format('YYYY-MM-DD'),
      repair_start_date: values.repair_start_date?.format('YYYY-MM-DD'),
    })
    message.success('维修记录已创建')
    setMaintOpen(false)
    form.resetFields()
    reload()
  }

  const onAssignSubmit = async (values: any) => {
    await machinesApi.createAssignment(id!, {
      ...values,
      start_date: values.start_date?.format('YYYY-MM-DD'),
      end_date: values.end_date?.format('YYYY-MM-DD') ?? null,
    })
    message.success('使用记录已创建')
    setAssignOpen(false)
    aForm.resetFields()
    machinesApi.listAssignments(id!).then((r) => setAssignments(r.data))
  }

  const onTestSubmit = async (values: any) => {
    await testRecordsApi.create({
      ...values,
      machine_id: id,
      start_date: values.start_date?.format('YYYY-MM-DD'),
      end_date: values.end_date?.format('YYYY-MM-DD') ?? null,
    })
    message.success('测试记录已创建')
    setTestOpen(false)
    tForm.resetFields()
    testRecordsApi.list(id).then(r => setTestRecords(r.data))
  }

  const openTestEdit = (r: any) => {
    setTestEditTarget(r)
    teForm.setFieldsValue({
      project_name: r.project_name,
      test_purpose: r.test_purpose,
      test_method: r.test_method,
      test_result: r.test_result,
      tester: r.tester,
      start_date: r.start_date ? dayjs(r.start_date) : null,
      end_date: r.end_date ? dayjs(r.end_date) : null,
      status: r.status,
      notes: r.notes,
    })
  }

  const onTestEditSubmit = async (values: any) => {
    await testRecordsApi.update(testEditTarget.id, {
      ...values,
      start_date: values.start_date?.format('YYYY-MM-DD'),
      end_date: values.end_date?.format('YYYY-MM-DD') ?? null,
    })
    message.success('已更新')
    setTestEditTarget(null)
    teForm.resetFields()
    testRecordsApi.list(id).then(r => setTestRecords(r.data))
  }

  const openEdit = () => {
    const customAttrFields: Record<string, string | null> = {}
    for (const def of attrDefs.filter((d: any) => !d.is_system)) {
      customAttrFields[def.field_key] = attrValues[def.field_key] ?? null
    }
    eForm.setFieldsValue({
      model: machine.model,
      description: machine.description,
      status: machine.status,
      usage_type: machine.usage_type,
      firmware_version: machine.firmware_version,
      image_version: machine.image_version,
      department: machine.department,
      ...customAttrFields,
    })
    setEditOpen(true)
  }

  const onEditSubmit = async (values: any) => {
    // Split custom attribute fields out from standard machine fields
    const SYSTEM_KEYS = new Set(['model', 'department', 'status', 'usage_type', 'firmware_version', 'image_version', 'description'])
    const machineData: Record<string, any> = {}
    const customAttrs: Record<string, string | null> = {}
    for (const [k, v] of Object.entries(values)) {
      if (SYSTEM_KEYS.has(k)) {
        machineData[k] = v
      } else {
        customAttrs[k] = v as string | null
      }
    }
    await machinesApi.update(id!, machineData)
    if (Object.keys(customAttrs).length > 0) {
      await machinesApi.setAttributeValues(id!, { values: customAttrs })
    }
    message.success('已更新')
    setEditOpen(false)
    machinesApi.get(id!).then((r) => setMachine(r.data))
    machinesApi.getAttributeValues(id!).then((r) => setAttrValues(r.data.values ?? {}))
  }

  if (!machine) return null

  const maintCols = [
    { title: '损坏日期', dataIndex: 'damage_date' },
    { title: '地点', dataIndex: 'location', render: (v: string) => v || '-' },
    { title: '损坏原因', dataIndex: 'damage_cause' },
    { title: '损坏描述', dataIndex: 'damage_description' },
    { title: '维修详情', dataIndex: 'repair_detail', render: (v: string) => v || '-' },
    { title: '修好日期', dataIndex: 'repair_end_date', render: (v: string) => v || '-' },
    { title: '状态', dataIndex: 'is_resolved', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '已修复' : '未完成'}</Tag> },
  ]

  const assignCols = [
    { title: '使用部门', dataIndex: 'department', render: (v: string) => deptLabel[v] ?? v },
    { title: '项目名称', dataIndex: 'project_name', render: (v: string) => v || '-' },
    { title: '开始日期', dataIndex: 'start_date' },
    { title: '结束日期', dataIndex: 'end_date', render: (v: string) => v || '-' },
    { title: '备注', dataIndex: 'notes', render: (v: string) => v || '-' },
  ]

  const testCols = [
    { title: '项目名称', dataIndex: 'project_name' },
    { title: '负责人', dataIndex: 'tester', render: (v: string) => v || '-' },
    { title: '开始日期', dataIndex: 'start_date' },
    { title: '结束日期', dataIndex: 'end_date', render: (v: string) => v || '-' },
    { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={testStatusColor[s]}>{testStatusLabel[s]}</Tag> },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setTestDetailTarget(r)}>详情</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openTestEdit(r)}>编辑</Button>
        </Space>
      ),
    },
  ]

  const mktCols = [
    { title: '活动名称', dataIndex: 'event_name' },
    { title: '申请人', dataIndex: 'requester_name' },
    { title: '地点', dataIndex: 'location' },
    { title: '使用日期', key: 'dates', render: (_: any, r: any) => `${r.start_date} ~ ${r.end_date}` },
    { title: '数量', dataIndex: 'quantity_needed', render: (v: number) => `${v} 台` },
    { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={mktStatusColor[s]}>{mktStatusLabel[s]}</Tag> },
    { title: '详情', key: 'detail', render: (_: any, r: any) => <Button size="small" icon={<EyeOutlined />} onClick={() => setMktDetailTarget(r)}>查看</Button> },
  ]

  const RESOURCE_TYPE_LABEL: Record<string, string> = {
    motor_firmware: '电机固件',
    power_board: '电源板',
    system_image: '系统镜像',
  }

  const RESOURCE_TYPE_COLOR: Record<string, string> = {
    motor_firmware: 'blue',
    power_board: 'orange',
    system_image: 'purple',
  }

  const resourceOptions = [
    ...allMotorFirmware.map((r: any) => ({ value: `motor_firmware::${r.id}`, label: `[电机固件] ${r.name}${r.machine_model ? ` (${r.machine_model})` : ''}` })),
    ...allPowerBoard.map((r: any) => ({ value: `power_board::${r.id}`, label: `[电源板] ${r.name}${r.machine_model ? ` (${r.machine_model})` : ''}` })),
    ...allSystemImage.map((r: any) => ({ value: `system_image::${r.id}`, label: `[系统镜像] ${r.name}${r.machine_model ? ` (${r.machine_model})` : ''}` })),
  ]

  const onAddResourceLink = async (values: any) => {
    const [resource_type, resource_id] = values.resource_ref.split('::')
    try {
      await machinesApi.addResourceLink(id!, { resource_type, resource_id })
      message.success('已关联')
      setResourceLinkOpen(false)
      rlForm.resetFields()
      machinesApi.listResourceLinks(id!).then(r => setResourceLinks(r.data))
    } catch (e: any) {
      message.error(e.response?.data?.detail || '关联失败')
    }
  }

  const onDeleteResourceLink = async (linkId: string) => {
    try {
      await machinesApi.deleteResourceLink(id!, linkId)
      message.success('已删除')
      machinesApi.listResourceLinks(id!).then(r => setResourceLinks(r.data))
    } catch (e: any) {
      message.error(e.response?.data?.detail || '删除失败')
    }
  }


  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/machines')} style={{ marginBottom: 16 }}>返回列表</Button>
      <Descriptions
        bordered
        title={`机器详情：${machine.serial_number}`}
        style={{ marginBottom: 24 }}
        extra={role === 'admin' && <Button icon={<EditOutlined />} onClick={openEdit}>编辑</Button>}
      >
        <Descriptions.Item label="序列号">{machine.serial_number}</Descriptions.Item>
        <Descriptions.Item label="型号">{machine.model}</Descriptions.Item>
        <Descriptions.Item label="状态"><Tag color={statusColor[machine.status]}>{statusLabel[machine.status]}</Tag></Descriptions.Item>
        <Descriptions.Item label="用途">{machine.usage_type ? usageLabel[machine.usage_type] : '-'}</Descriptions.Item>
        <Descriptions.Item label="描述" span={3}>{machine.description || '-'}</Descriptions.Item>
        <Descriptions.Item
          label={
            <Space>
              资源配置
              {role === 'admin' && (
                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => setResourceLinkOpen(true)}>关联</Button>
              )}
            </Space>
          }
          span={3}
        >
          <Space wrap size={[6, 6]}>
            {resourceLinks.length === 0 && <span style={{ color: '#999' }}>暂无关联版本</span>}
            {resourceLinks.map((link: any) => (
              role === 'admin' ? (
                <Popconfirm
                  key={link.id}
                  title="确认删除此关联？"
                  onConfirm={() => onDeleteResourceLink(link.id)}
                  okText="删除"
                  cancelText="取消"
                >
                  <Tag
                    color={RESOURCE_TYPE_COLOR[link.resource_type] || 'default'}
                    closable
                    onClose={(e) => { e.preventDefault() }}
                    style={{ cursor: 'pointer' }}
                  >
                    {RESOURCE_TYPE_LABEL[link.resource_type]}：{link.resource_name || '(已删除)'}
                  </Tag>
                </Popconfirm>
              ) : (
                <Tag key={link.id} color={RESOURCE_TYPE_COLOR[link.resource_type] || 'default'}>
                  {RESOURCE_TYPE_LABEL[link.resource_type]}：{link.resource_name || '(已删除)'}
                </Tag>
              )
            ))}
          </Space>
        </Descriptions.Item>
        {attrDefs.filter((d: any) => !d.is_system).map((def: any) => (
          <Descriptions.Item key={def.field_key} label={def.display_name}>
            {attrValues[def.field_key] ?? '-'}
          </Descriptions.Item>
        ))}
      </Descriptions>

      <Tabs items={[
        {
          key: 'maintenance',
          label: '维修记录',
          children: (
            <>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setMaintOpen(true)} style={{ marginBottom: 12 }}>新增维修记录</Button>
              <Table dataSource={maintenances} columns={maintCols} rowKey="id" size="small" scroll={{ x: true }} />
            </>
          ),
        },
        {
          key: 'test',
          label: '测试记录',
          children: (
            <>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setTestOpen(true)} style={{ marginBottom: 12 }}>新增测试记录</Button>
              <Table dataSource={testRecords} columns={testCols} rowKey="id" size="small" scroll={{ x: true }} />
            </>
          ),
        },
        {
          key: 'assignments',
          label: '内部使用记录',
          children: (
            <>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAssignOpen(true)} style={{ marginBottom: 12 }}>新增使用记录</Button>
              <Table dataSource={assignments} columns={assignCols} rowKey="id" size="small" scroll={{ x: true }} />
            </>
          ),
        },
        {
          key: 'marketing',
          label: '市场使用记录',
          children: (
            <Table dataSource={mktAllocations} columns={mktCols} rowKey="id" size="small" scroll={{ x: true }} />
          ),
        },
      ]} />

      <Modal title="编辑机器信息" open={editOpen} onCancel={() => setEditOpen(false)} footer={null}>
        <Form form={eForm} layout="vertical" onFinish={onEditSubmit}>
          <Form.Item label="型号" name="model" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="选择型号"
              options={models.map(m => ({ value: m, label: m }))}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label="所属部门" name="department">
            <Select allowClear placeholder="选择部门" options={departments.map(d => ({ value: d, label: d }))} />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select options={[
              { value: 'idle', label: '空闲' },
              { value: 'in_use', label: '使用中' },
              { value: 'under_repair', label: '维修中' },
              { value: 'retired', label: '已退役' },
            ]} />
          </Form.Item>
          <Form.Item label="用途" name="usage_type">
            <Select allowClear placeholder="选择用途" options={[
              { value: 'motion_control', label: '运控' },
              { value: 'testing', label: '测试' },
              { value: 'software', label: '软件' },
              { value: 'marketing', label: '市场' },
            ]} />
          </Form.Item>
          <Form.Item label="固件版本" name="firmware_version">
            <Input placeholder="例：v1.2.3" />
          </Form.Item>
          <Form.Item label="镜像" name="image_version">
            <Input placeholder="例：ros2-humble-20240101" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          {attrDefs.filter((d: any) => !d.is_system).map((def: any) => (
            <Form.Item key={def.field_key} label={def.display_name} name={def.field_key}>
              {def.field_type === 'select' && def.preset_values?.length > 0 ? (
                <Select
                  allowClear
                  showSearch
                  placeholder={`选择${def.display_name}`}
                  options={def.preset_values.map((v: string) => ({ value: v, label: v }))}
                />
              ) : (
                <Input placeholder={def.display_name} />
              )}
            </Form.Item>
          ))}
          <Form.Item>
            <Button type="primary" htmlType="submit" block>保存</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="新增维修记录" open={maintOpen} onCancel={() => setMaintOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onMaintSubmit}>
          <Form.Item label="损坏日期" name="damage_date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="损坏原因" name="damage_cause" rules={[{ required: true }]}>
            <Select
              showSearch mode="tags" maxTagCount={1}
              placeholder="选择预设原因或手动输入"
              options={damageCauses.map(c => ({ value: c, label: c }))}
              onChange={(vals: string[]) => {
                // tags mode returns array; normalise to single string
                form.setFieldValue('damage_cause', Array.isArray(vals) ? vals[vals.length - 1] : vals)
              }}
            />
          </Form.Item>
          <Form.Item label="损坏描述" name="damage_description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="维修开始日期" name="repair_start_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="维修详情" name="repair_detail">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="新增使用记录" open={assignOpen} onCancel={() => setAssignOpen(false)} footer={null}>
        <Form form={aForm} layout="vertical" onFinish={onAssignSubmit}>
          <Form.Item label="使用部门" name="department" rules={[{ required: true }]}>
            <Select options={[{ value: 'rd', label: '研发' }, { value: 'test', label: '测试' }, { value: 'marketing', label: '市场' }]} />
          </Form.Item>
          <Form.Item label="项目名称" name="project_name">
            <Input placeholder="关联项目或活动名称" />
          </Form.Item>
          <Form.Item label="开始日期" name="start_date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="结束日期" name="end_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── 测试记录新增 ── */}
      <Modal title="新增测试记录" open={testOpen} onCancel={() => { setTestOpen(false); tForm.resetFields() }} footer={null} width={600}>
        <Form form={tForm} layout="vertical" onFinish={onTestSubmit}>
          <Form.Item label="项目名称" name="project_name" rules={[{ required: true }]}>
            <Input placeholder="例：NIX2 室内导航测试" />
          </Form.Item>
          <Form.Item label="测试目的" name="test_purpose" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="描述测试目标" />
          </Form.Item>
          <Form.Item label="测试方法" name="test_method">
            <Input.TextArea rows={2} placeholder="如何进行测试" />
          </Form.Item>
          <Form.Item label="测试结果" name="test_result">
            <Input.TextArea rows={2} placeholder="记录测试结论" />
          </Form.Item>
          <Form.Item label="负责人" name="tester">
            <Input placeholder="姓名" />
          </Form.Item>
          <Form.Item label="开始日期" name="start_date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="结束日期" name="end_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue="in_progress">
            <Select options={[
              { value: 'in_progress', label: '进行中' }, { value: 'completed', label: '已完成' },
              { value: 'failed', label: '失败' }, { value: 'paused', label: '暂停' },
            ]} />
          </Form.Item>
          <Form.Item label="备注" name="notes"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>提交</Button></Form.Item>
        </Form>
      </Modal>

      {/* ── 测试记录编辑 ── */}
      <Modal title="编辑测试记录" open={!!testEditTarget} onCancel={() => { setTestEditTarget(null); teForm.resetFields() }} footer={null} width={600}>
        <Form form={teForm} layout="vertical" onFinish={onTestEditSubmit}>
          <Form.Item label="项目名称" name="project_name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="测试目的" name="test_purpose" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="测试方法" name="test_method"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="测试结果" name="test_result"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="负责人" name="tester"><Input /></Form.Item>
          <Form.Item label="开始日期" name="start_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="结束日期" name="end_date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="状态" name="status">
            <Select options={[
              { value: 'in_progress', label: '进行中' }, { value: 'completed', label: '已完成' },
              { value: 'failed', label: '失败' }, { value: 'paused', label: '暂停' },
            ]} />
          </Form.Item>
          <Form.Item label="备注" name="notes"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block>保存</Button></Form.Item>
        </Form>
      </Modal>

      {/* ── 测试记录详情 ── */}
      <Modal title="测试记录详情" open={!!testDetailTarget} onCancel={() => setTestDetailTarget(null)} footer={<Button onClick={() => setTestDetailTarget(null)}>关闭</Button>} width={640}>
        {testDetailTarget && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="项目名称">{testDetailTarget.project_name}</Descriptions.Item>
            <Descriptions.Item label="负责人">{testDetailTarget.tester || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={testStatusColor[testDetailTarget.status]}>{testStatusLabel[testDetailTarget.status]}</Tag></Descriptions.Item>
            <Descriptions.Item label="开始日期">{testDetailTarget.start_date}</Descriptions.Item>
            <Descriptions.Item label="结束日期">{testDetailTarget.end_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="测试目的" span={2}>{testDetailTarget.test_purpose}</Descriptions.Item>
            <Descriptions.Item label="测试方法" span={2}>{testDetailTarget.test_method || '-'}</Descriptions.Item>
            <Descriptions.Item label="测试结果" span={2}>{testDetailTarget.test_result || '-'}</Descriptions.Item>
            {testDetailTarget.notes && <Descriptions.Item label="备注" span={2}>{testDetailTarget.notes}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>

      {/* ── 市场使用详情 ── */}
      <Modal title="市场使用详情" open={!!mktDetailTarget} onCancel={() => setMktDetailTarget(null)} footer={<Button onClick={() => setMktDetailTarget(null)}>关闭</Button>} width={640}>
        {mktDetailTarget && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="活动名称" span={2}>{mktDetailTarget.event_name}</Descriptions.Item>
            <Descriptions.Item label="申请人">{mktDetailTarget.requester_name}</Descriptions.Item>
            <Descriptions.Item label="联系方式">{mktDetailTarget.requester_contact || '-'}</Descriptions.Item>
            <Descriptions.Item label="活动地点" span={2}>{mktDetailTarget.location}</Descriptions.Item>
            <Descriptions.Item label="使用日期">{mktDetailTarget.start_date} ~ {mktDetailTarget.end_date}</Descriptions.Item>
            <Descriptions.Item label="申请数量">{mktDetailTarget.quantity_needed} 台</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={mktStatusColor[mktDetailTarget.status]}>{mktStatusLabel[mktDetailTarget.status]}</Tag></Descriptions.Item>
            {mktDetailTarget.notes && <Descriptions.Item label="备注" span={2}>{mktDetailTarget.notes}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>

      {/* ── 关联版本资源 ── */}
      <Modal title="关联版本资源" open={resourceLinkOpen} onCancel={() => { setResourceLinkOpen(false); rlForm.resetFields() }} footer={null}>
        <Form form={rlForm} layout="vertical" onFinish={onAddResourceLink}>
          <Form.Item label="选择版本资源" name="resource_ref" rules={[{ required: true, message: '请选择资源' }]}>
            <Select
              showSearch
              placeholder="搜索并选择版本资源"
              optionFilterProp="label"
              options={resourceOptions}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>关联</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
