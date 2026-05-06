import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, DatePicker, Tag, Space, Popconfirm, message, Descriptions } from 'antd'
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { testRecordsApi, machinesApi } from '../../api'
import { useAuthStore } from '../../store/auth'

const statusLabel: Record<string, string> = {
  in_progress: '进行中',
  completed: '已完成',
  failed: '失败',
  paused: '暂停',
}
const statusColor: Record<string, string> = {
  in_progress: 'blue',
  completed: 'green',
  failed: 'red',
  paused: 'orange',
}

export default function TestRecordsPage() {
  const [records, setRecords] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [detailTarget, setDetailTarget] = useState<any>(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const role = useAuthStore(s => s.role)

  const load = async () => {
    setLoading(true)
    try {
      const res = await testRecordsApi.list()
      setRecords(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    machinesApi.list().then(r => setMachines(r.data))
  }, [])

  const onCreate = async (values: any) => {
    try {
      await testRecordsApi.create({
        ...values,
        start_date: values.start_date?.format('YYYY-MM-DD'),
        end_date: values.end_date?.format('YYYY-MM-DD') ?? null,
      })
      message.success('测试记录已创建')
      setCreateOpen(false)
      createForm.resetFields()
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '创建失败')
    }
  }

  const openEdit = (record: any) => {
    setEditTarget(record)
    editForm.setFieldsValue({
      project_name: record.project_name,
      test_purpose: record.test_purpose,
      test_method: record.test_method,
      test_result: record.test_result,
      tester: record.tester,
      start_date: record.start_date ? dayjs(record.start_date) : null,
      end_date: record.end_date ? dayjs(record.end_date) : null,
      status: record.status,
      notes: record.notes,
    })
  }

  const onEdit = async (values: any) => {
    try {
      await testRecordsApi.update(editTarget.id, {
        ...values,
        start_date: values.start_date?.format('YYYY-MM-DD'),
        end_date: values.end_date?.format('YYYY-MM-DD') ?? null,
      })
      message.success('已更新')
      setEditTarget(null)
      editForm.resetFields()
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '更新失败')
    }
  }

  const onDelete = async (id: string) => {
    try {
      await testRecordsApi.delete(id)
      message.success('已删除')
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '删除失败')
    }
  }

  const machineSerial = (id: string) => machines.find(m => m.id === id)?.serial_number ?? id

  const columns = [
    { title: '机器号', dataIndex: 'machine_id', key: 'machine_id', render: (v: string) => machineSerial(v) },
    { title: '项目名称', dataIndex: 'project_name', key: 'project_name' },
    { title: '负责人', dataIndex: 'tester', key: 'tester', render: (v: string) => v || '-' },
    { title: '开始日期', dataIndex: 'start_date', key: 'start_date' },
    { title: '结束日期', dataIndex: 'end_date', key: 'end_date', render: (v: string) => v || '-' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag>,
    },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailTarget(r)}>详情</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          {role === 'admin' && (
            <Popconfirm title="确认删除？" onConfirm={() => onDelete(r.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const TestForm = ({ form, onFinish, showMachine }: { form: any; onFinish: (v: any) => void; showMachine: boolean }) => (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      {showMachine && (
        <Form.Item label="机器" name="machine_id" rules={[{ required: true }]}>
          <Select showSearch placeholder="选择机器" options={machines.map(m => ({ value: m.id, label: m.serial_number }))} optionFilterProp="label" />
        </Form.Item>
      )}
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
          { value: 'in_progress', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'failed', label: '失败' },
          { value: 'paused', label: '暂停' },
        ]} />
      </Form.Item>
      <Form.Item label="备注" name="notes">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" block>保存</Button>
      </Form.Item>
    </Form>
  )

  return (
    <div>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>测试记录</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新增测试记录</Button>
      </Space>

      <Table dataSource={records} columns={columns} rowKey="id" loading={loading} scroll={{ x: true }} />

      <Modal title="新增测试记录" open={createOpen} onCancel={() => { setCreateOpen(false); createForm.resetFields() }} footer={null} width={600}>
        <TestForm form={createForm} onFinish={onCreate} showMachine={true} />
      </Modal>

      <Modal title="编辑测试记录" open={!!editTarget} onCancel={() => { setEditTarget(null); editForm.resetFields() }} footer={null} width={600}>
        <TestForm form={editForm} onFinish={onEdit} showMachine={false} />
      </Modal>

      <Modal title="测试记录详情" open={!!detailTarget} onCancel={() => setDetailTarget(null)} footer={<Button onClick={() => setDetailTarget(null)}>关闭</Button>} width={640}>
        {detailTarget && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="机器号">{machineSerial(detailTarget.machine_id)}</Descriptions.Item>
            <Descriptions.Item label="项目名称">{detailTarget.project_name}</Descriptions.Item>
            <Descriptions.Item label="负责人">{detailTarget.tester || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={statusColor[detailTarget.status]}>{statusLabel[detailTarget.status]}</Tag></Descriptions.Item>
            <Descriptions.Item label="开始日期">{detailTarget.start_date}</Descriptions.Item>
            <Descriptions.Item label="结束日期">{detailTarget.end_date || '-'}</Descriptions.Item>
            <Descriptions.Item label="测试目的" span={2}>{detailTarget.test_purpose}</Descriptions.Item>
            <Descriptions.Item label="测试方法" span={2}>{detailTarget.test_method || '-'}</Descriptions.Item>
            <Descriptions.Item label="测试结果" span={2}>{detailTarget.test_result || '-'}</Descriptions.Item>
            {detailTarget.notes && <Descriptions.Item label="备注" span={2}>{detailTarget.notes}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
