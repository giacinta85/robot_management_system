import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tabs, Descriptions, Tag, Button, Table, Modal, Form, Input, Select, DatePicker, message } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons'
import { machinesApi, maintenanceApi, adminResourcesApi } from '../../api'

const statusLabel: Record<string, string> = { idle: '空闲', in_use: '使用中', under_repair: '维修中', retired: '已退役' }
const statusColor: Record<string, string> = { idle: 'green', in_use: 'blue', under_repair: 'red', retired: 'default' }
const deptLabel: Record<string, string> = { rd: '研发', test: '测试', marketing: '市场' }
const usageLabel: Record<string, string> = { motion_control: '运控', testing: '测试', software: '软件', marketing: '市场' }

export default function MachineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [machine, setMachine] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [maintenances, setMaintenances] = useState<any[]>([])
  const [maintOpen, setMaintOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [form] = Form.useForm()
  const [aForm] = Form.useForm()
  const [eForm] = Form.useForm()

  const reload = () => {
    if (!id) return
    machinesApi.get(id).then((r) => setMachine(r.data))
    machinesApi.listAssignments(id).then((r) => setAssignments(r.data))
    maintenanceApi.list(id).then((r) => setMaintenances(r.data))
  }

  useEffect(() => {
    reload()
    adminResourcesApi.listMachineModels().then(r => setModels(r.data.map((m: any) => m.name)))
    adminResourcesApi.listDepartments().then(r => setDepartments(r.data.map((d: any) => d.name)))
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
      end_date: values.end_date?.format('YYYY-MM-DD'),
    })
    message.success('使用记录已创建')
    setAssignOpen(false)
    aForm.resetFields()
    machinesApi.listAssignments(id!).then((r) => setAssignments(r.data))
  }

  const openEdit = () => {
    eForm.setFieldsValue({
      model: machine.model,
      description: machine.description,
      status: machine.status,
      usage_type: machine.usage_type,
      firmware_version: machine.firmware_version,
      image_version: machine.image_version,
      department: machine.department,
    })
    setEditOpen(true)
  }

  const onEditSubmit = async (values: any) => {
    await machinesApi.update(id!, values)
    message.success('已更新')
    setEditOpen(false)
    machinesApi.get(id!).then((r) => setMachine(r.data))
  }

  if (!machine) return null

  const maintCols = [
    { title: '损坏日期', dataIndex: 'damage_date' },
    { title: '地点', dataIndex: 'location', render: (v: string) => v || '-' },
    { title: '损坏原因', dataIndex: 'damage_cause' },
    { title: '损坏描述', dataIndex: 'damage_description' },
    { title: '维修详情', dataIndex: 'repair_detail' },
    { title: '修好日期', dataIndex: 'repair_end_date' },
    { title: '状态', dataIndex: 'is_resolved', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '已修复' : '未完成'}</Tag> },
  ]

  const assignCols = [
    { title: '部门', dataIndex: 'department', render: (v: string) => deptLabel[v] },
    { title: '开始日期', dataIndex: 'start_date' },
    { title: '结束日期', dataIndex: 'end_date' },
    { title: '备注', dataIndex: 'notes' },
  ]

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/machines')} style={{ marginBottom: 16 }}>返回列表</Button>
      <Descriptions
        bordered
        title={`机器详情：${machine.serial_number}`}
        style={{ marginBottom: 24 }}
        extra={<Button icon={<EditOutlined />} onClick={openEdit}>编辑</Button>}
      >
        <Descriptions.Item label="序列号">{machine.serial_number}</Descriptions.Item>
        <Descriptions.Item label="型号">{machine.model}</Descriptions.Item>
        <Descriptions.Item label="状态"><Tag color={statusColor[machine.status]}>{statusLabel[machine.status]}</Tag></Descriptions.Item>
        <Descriptions.Item label="用途">{machine.usage_type ? usageLabel[machine.usage_type] : '-'}</Descriptions.Item>
        <Descriptions.Item label="固件版本">{machine.firmware_version || '-'}</Descriptions.Item>
        <Descriptions.Item label="镜像">{machine.image_version || '-'}</Descriptions.Item>
        <Descriptions.Item label="描述" span={3}>{machine.description || '-'}</Descriptions.Item>
      </Descriptions>

      <Tabs items={[
        {
          key: 'maintenance',
          label: '维修记录',
          children: (
            <>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setMaintOpen(true)} style={{ marginBottom: 12 }}>新增维修记录</Button>
              <Table dataSource={maintenances} columns={maintCols} rowKey="id" size="small" />
            </>
          ),
        },
        {
          key: 'assignments',
          label: '使用记录',
          children: (
            <>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAssignOpen(true)} style={{ marginBottom: 12 }}>新增使用记录</Button>
              <Table dataSource={assignments} columns={assignCols} rowKey="id" size="small" />
            </>
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
            <Input placeholder="摔落/碰撞/电路故障..." />
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
    </div>
  )
}
