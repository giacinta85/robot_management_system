import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, message, Tag, Space, Popconfirm } from 'antd'
import { PlusOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { machinesApi, adminResourcesApi } from '../../api'
import { useAuthStore } from '../../store/auth'

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
const usageLabel: Record<string, string> = {
  motion_control: '运控',
  testing: '测试',
  software: '软件',
  marketing: '市场',
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const [models, setModels] = useState<string[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const navigate = useNavigate()
  const role = useAuthStore(s => s.role)

  const load = async () => {
    setLoading(true)
    try {
      const res = await machinesApi.list()
      setMachines(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    adminResourcesApi.listMachineModels().then(r => setModels(r.data.map((m: any) => m.name)))
    adminResourcesApi.listDepartments().then(r => setDepartments(r.data.map((d: any) => d.name)))
  }, [])

  const onDelete = async (id: string) => {
    try {
      await machinesApi.delete(id)
      message.success('已删除')
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '删除失败')
    }
  }

  const onSubmit = async (values: any) => {
    try {
      await machinesApi.create(values)
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
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      render: (v: string) => v ? <Tag color="geekblue">{v}</Tag> : '-',
    },
    {
      title: '用途',
      dataIndex: 'usage_type',
      key: 'usage_type',
      render: (v: string) => v ? <Tag>{usageLabel[v] ?? v}</Tag> : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag>,
    },
    { title: '固件版本', dataIndex: 'firmware_version', key: 'firmware_version', render: (v: string) => v || '-' },
    { title: '镜像', dataIndex: 'image_version', key: 'image_version', render: (v: string) => v || '-' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/machines/${record.id}`)}>详情</Button>
          {role === 'admin' && (
            <Popconfirm title="确认删除此机器？" description="关联数据将一并删除。" onConfirm={() => onDelete(record.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>机器列表</h2>
        {role === 'admin' && <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增机器</Button>}
      </Space>
      <Table dataSource={machines} columns={columns} rowKey="id" loading={loading} scroll={{ x: true }} />

      <Modal title="新增机器" open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item label="序列号" name="serial_number" rules={[{ required: true }]}>
            <Input placeholder="例：ROBOT-001" />
          </Form.Item>
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
            <Button type="primary" htmlType="submit" block>创建</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
