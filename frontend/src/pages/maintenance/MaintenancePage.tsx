import { useEffect, useState } from 'react'
import { Table, Tag, Button, Modal, Form, DatePicker, Input, Select, message, Space, Card, Descriptions, Typography, Switch, Divider, Popconfirm } from 'antd'
import { CheckOutlined, PlusOutlined, EditOutlined, ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { maintenanceApi, machinesApi, adminResourcesApi } from '../../api'

export default function MaintenancePage() {
  const [records, setRecords] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [damageCauses, setDamageCauses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)   // 全页面编辑
  const [addForm] = Form.useForm()
  const [editForm] = Form.useForm()

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

  useEffect(() => {
    load()
    adminResourcesApi.listDamageCausePresets().then(r => setDamageCauses(r.data.map((d: any) => d.name)))
  }, [])

  const openEdit = (record: any) => {
    setEditing(record)
    editForm.setFieldsValue({
      location: record.location,
      damage_date: record.damage_date ? dayjs(record.damage_date) : null,
      damage_cause: record.damage_cause,
      damage_description: record.damage_description,
      repair_start_date: record.repair_start_date ? dayjs(record.repair_start_date) : null,
      repair_end_date: record.repair_end_date ? dayjs(record.repair_end_date) : null,
      repair_detail: record.repair_detail,
      is_resolved: record.is_resolved,
    })
  }

  const onEditSave = async (values: any) => {
    try {
      await maintenanceApi.update(editing.id, {
        ...values,
        damage_date: values.damage_date?.format('YYYY-MM-DD'),
        repair_start_date: values.repair_start_date?.format('YYYY-MM-DD'),
        repair_end_date: values.repair_end_date?.format('YYYY-MM-DD'),
      })
      message.success('维修记录已更新')
      setEditing(null)
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '保存失败')
    }
  }

  const onDelete = async (id: string) => {
    try {
      await maintenanceApi.delete(id)
      message.success('已删除')
      load()
    } catch (e: any) {
      message.error(e.response?.data?.detail || '删除失败')
    }
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
    { title: '机器', dataIndex: 'machine_id', render: (id: string) => machineLabel(id), ellipsis: true },
    { title: '地点', dataIndex: 'location', render: (v: string) => v || '-' },
    { title: '损坏日期', dataIndex: 'damage_date' },
    { title: '损坏原因', dataIndex: 'damage_cause', ellipsis: true },
    { title: '维修开始', dataIndex: 'repair_start_date', render: (v: string) => v || '-' },
    { title: '修复日期', dataIndex: 'repair_end_date', render: (v: string) => v || '-' },
    { title: '状态', dataIndex: 'is_resolved', render: (v: boolean) => <Tag color={v ? 'green' : 'orange'}>{v ? '已修复' : '维修中'}</Tag> },
    {
      title: '操作', width: 130,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除此条维修记录？" onConfirm={() => onDelete(record.id)} okText="删除" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ── 全页面编辑（同审批页面模式）─────────────────────────────
  if (editing) {
    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => setEditing(null)} style={{ marginBottom: 16 }}>
          返回列表
        </Button>
        <Typography.Title level={4}>编辑维修记录</Typography.Title>

        <Card title="当前信息" style={{ marginBottom: 16 }}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="机器">{machineLabel(editing.machine_id)}</Descriptions.Item>
            <Descriptions.Item label="原始损坏日期">{editing.damage_date}</Descriptions.Item>
            <Descriptions.Item label="原始损坏原因" span={2}>{editing.damage_cause}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="修改内容">
          <Form form={editForm} layout="vertical" onFinish={onEditSave} style={{ maxWidth: 600 }}>
            <Form.Item label="损坏/维修地点" name="location">
              <Input placeholder="例：上海展馆 / 公司仓库" />
            </Form.Item>
            <Form.Item label="损坏日期" name="damage_date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="损坏原因" name="damage_cause">
              <Select
                showSearch mode="tags" maxTagCount={1}
                placeholder="选择预设原因或手动输入"
                options={damageCauses.map(c => ({ value: c, label: c }))}
                onChange={(vals: string[]) => {
                  editForm.setFieldValue('damage_cause', Array.isArray(vals) ? vals[vals.length - 1] : vals)
                }}
              />
            </Form.Item>
            <Form.Item label="损坏描述" name="damage_description">
              <Input.TextArea rows={3} placeholder="详细描述损坏情况" />
            </Form.Item>

            <Divider orientation="left">维修进度</Divider>

            <Form.Item label="维修开始日期" name="repair_start_date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="维修详情" name="repair_detail">
              <Input.TextArea rows={3} placeholder="描述维修过程、更换零件等" />
            </Form.Item>
            <Form.Item label="修复完成日期" name="repair_end_date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="是否已修复" name="is_resolved" valuePropName="checked">
              <Switch checkedChildren="已修复" unCheckedChildren="维修中" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">保存修改</Button>
                <Button onClick={() => setEditing(null)}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    )
  }

  // ── 列表页 ────────────────────────────────────────────────
  return (
    <div>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>维修记录</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>新增维修记录</Button>
      </Space>
      <Table dataSource={records} columns={columns} rowKey="id" loading={loading} size="small" scroll={{ x: true }} />

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
            <Select
              showSearch mode="tags" maxTagCount={1}
              placeholder="选择预设原因或手动输入"
              options={damageCauses.map(c => ({ value: c, label: c }))}
              onChange={(vals: string[]) => {
                addForm.setFieldValue('damage_cause', Array.isArray(vals) ? vals[vals.length - 1] : vals)
              }}
            />
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
    </div>
  )
}
