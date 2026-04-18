import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Tag, Space } from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { machinesApi } from '../../api'

const statusColor: Record<string, string> = {
  idle: 'green',
  in_use: 'blue',
  under_repair: 'red',
  retired: 'default',
}
const statusLabel: Record<string, string> = {
  idle: '空闲',
  in_use: '使用中',
  under_repair: '维修中',
  retired: '已退役',
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const res = await machinesApi.list()
      setMachines(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onSubmit = async (values: any) => {
    try {
      await machinesApi.create({ ...values, purchased_at: values.purchased_at?.format('YYYY-MM-DD') })
      message.success('机器已创建')
      setOpen(false)
      form.resetFields()
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '创建失败')
    }
  }

  const columns = [
    { title: '序列号', dataIndex: 'serial_number', key: 'serial_number' },
    { title: '型号', dataIndex: 'model', key: 'model' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag>,
    },
    { title: '购入日期', dataIndex: 'purchased_at', key: 'purchased_at' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/machines/${record.id}`)}>
          详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>机器列表</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增机器</Button>
      </Space>
      <Table dataSource={machines} columns={columns} rowKey="id" loading={loading} />

      <Modal title="新增机器" open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item label="序列号" name="serial_number" rules={[{ required: true }]}>
            <Input placeholder="例：ROBOT-001" />
          </Form.Item>
          <Form.Item label="型号" name="model" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="购入日期" name="purchased_at">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>创建</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
