import { useEffect, useState } from 'react'
import { Table, Tag, Button, Modal, Form, DatePicker, Input, InputNumber, Select, message, Space } from 'antd'
import { CheckOutlined, PlusOutlined } from '@ant-design/icons'
import { maintenanceApi, machinesApi } from '../../api'

export default function MaintenancePage() {
  const [records, setRecords] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [resolveId, setResolveId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [resolveForm] = Form.useForm()
  const [addForm] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const [rRes, mRes] = await Promise.all([maintenanceApi.list(), machinesApi.list()])
      setRecords(rRes.data)
      setMachines(mRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onResolve = async (values: any) => {
    await maintenanceApi.update(resolveId!, {
      repair_detail: values.repair_detail,
      repair_end_date: values.repair_end_date?.format('YYYY-MM-DD'),
      is_resolved: true,
    })
    message.success('维修已标记完成')
    setResolveId(null)
    resolveForm.resetFields()
    load()
  }

  const onAdd = async (values: any) => {
    try {
      await maintenanceApi.create({
        machine_id: values.machine_id,
        location: values.location,
        damage_date: values.damage_date?.format('YYYY-MM-DD'),
        damage_cause: values.damage_cause,
        damage_description: values.damage_description,
        repair_start_date: values.repair_start_date?.format('YYYY-MM-DD'),
      })
      message.success('维修记录已创建')
      setAddOpen(false)
      addForm.resetFields()
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '创建失败')
    }
  }

  const machineLabel = (id: string) => {
    const m = machines.find((x: any) => x.id === id)
    return m ? `${m.serial_number} (${m.model})` : id
  }

  const columns = [
    {
      title: '机器',
      dataIndex: 'machine_id',
      key: 'machine_id',
      render: (id: string) => machineLabel(id),
      ellipsis: true,
    },
    { title: '地点', dataIndex: 'location', key: 'location' },
    { title: '损坏日期', dataIndex: 'damage_date', key: 'damage_date' },
    { title: '损坏原因', dataIndex: 'damage_cause', key: 'damage_cause', ellipsis: true },
    { title: '维修开始', dataIndex: 'repair_start_date', key: 'repair_start_date' },
    { title: '修复日期', dataIndex: 'repair_end_date', key: 'repair_end_date' },
    {
      title: '状态',
      dataIndex: 'is_resolved',
      key: 'is_resolved',
      render: (v: boolean) => <Tag color={v ? 'green' : 'orange'}>{v ? '已修复' : '维修中'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) =>
        !record.is_resolved ? (
          <Button size="small" icon={<CheckOutlined />} onClick={() => setResolveId(record.id)}>标记完成</Button>
        ) : null,
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>维修记录</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>新增维修记录</Button>
      </Space>
      <Table dataSource={records} columns={columns} rowKey="id" loading={loading} size="small" scroll={{ x: true }} />

      {/* 新增维修记录 */}
      <Modal title="新增维修记录" open={addOpen} onCancel={() => setAddOpen(false)} footer={null} width={520}>
        <Form form={addForm} layout="vertical" onFinish={onAdd}>
          <Form.Item label="机器" name="machine_id" rules={[{ required: true, message: '请选择机器' }]}>
            <Select
              showSearch
              placeholder="选择机器"
              optionFilterProp="label"
              options={machines.map((m: any) => ({ value: m.id, label: `${m.serial_number} (${m.model})` }))}
            />
          </Form.Item>
          <Form.Item label="损坏/维修地点" name="location">
            <Input placeholder="例：上海展馆 / 公司仓库" />
          </Form.Item>
          <Form.Item label="损坏日期" name="damage_date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="损坏原因" name="damage_cause" rules={[{ required: true }]}>
            <Input placeholder="例：碰撞、进水、电路故障" />
          </Form.Item>
          <Form.Item label="损坏情况描述" name="damage_description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="详细描述损坏情况" />
          </Form.Item>
          <Form.Item label="维修开始日期" name="repair_start_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 标记维修完成 */}
      <Modal title="标记维修完成" open={!!resolveId} onCancel={() => setResolveId(null)} footer={null}>
        <Form form={resolveForm} layout="vertical" onFinish={onResolve}>
          <Form.Item label="修复日期" name="repair_end_date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="维修详情" name="repair_detail">
            <Input.TextArea rows={3} placeholder="描述维修过程和更换的零件" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认完成</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
