import { useEffect, useState } from 'react'
import { Table, Tag, Select, Space, Input, Button, message, Drawer, Descriptions, Form, Typography } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { afterSalesApi } from '../../api'

const statusLabel: Record<string, string> = { pending: '待处理', in_progress: '处理中', resolved: '已解决', closed: '已关闭' }
const statusColor: Record<string, string> = { pending: 'orange', in_progress: 'blue', resolved: 'green', closed: 'default' }
const issueLabel: Record<string, string> = { hardware: '硬件故障', software: '软件问题', other: '其他' }
const urgencyLabel: Record<string, string> = { urgent: '紧急', normal: '正常', low: '不急' }
const urgencyColor: Record<string, string> = { urgent: 'red', normal: 'blue', low: 'default' }

export default function AfterSalesListPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    const r = await afterSalesApi.listRequests()
    setData(r.data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const onStatusChange = async (id: string, status: string) => {
    await afterSalesApi.updateRequest(id, { status })
    message.success('状态已更新')
    load()
  }

  const onSaveNotes = async (values: any) => {
    await afterSalesApi.updateRequest(selected.id, { handled_notes: values.handled_notes })
    message.success('备注已保存')
    const updated = (await afterSalesApi.listRequests()).data.find((r: any) => r.id === selected.id)
    setSelected(updated)
    load()
  }

  const columns = [
    { title: '申请人', dataIndex: 'requester_name', width: 100 },
    { title: '型号', dataIndex: 'machine_model', width: 90, render: (v: string) => v || '-' },
    { title: '序列号', dataIndex: 'machine_serial', width: 120, render: (v: string) => v || '-' },
    { title: '问题类型', dataIndex: 'issue_type', width: 100, render: (v: string) => issueLabel[v] || v },
    { title: '紧急程度', dataIndex: 'urgency', width: 90, render: (v: string) => <Tag color={urgencyColor[v]}>{urgencyLabel[v]}</Tag> },
    {
      title: '状态', dataIndex: 'status', width: 120,
      render: (s: string, r: any) => (
        <Select
          size="small"
          value={s}
          style={{ width: 100 }}
          onChange={(v) => onStatusChange(r.id, v)}
          options={[
            { value: 'pending', label: '待处理' },
            { value: 'in_progress', label: '处理中' },
            { value: 'resolved', label: '已解决' },
            { value: 'closed', label: '已关闭' },
          ]}
        />
      ),
    },
    {
      title: '操作', width: 80,
      render: (_: any, r: any) => <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelected(r); form.setFieldsValue({ handled_notes: r.handled_notes }) }}>详情</Button>,
    },
  ]

  return (
    <div>
      <h2>售后需求管理</h2>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} scroll={{ x: true }} />

      <Drawer title="售后详情" open={!!selected} onClose={() => setSelected(null)} width={520}>
        {selected && (
          <>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="申请人">{selected.requester_name}</Descriptions.Item>
              <Descriptions.Item label="联系方式">{selected.requester_contact || '-'}</Descriptions.Item>
              <Descriptions.Item label="机器型号">{selected.machine_model || '-'}</Descriptions.Item>
              <Descriptions.Item label="序列号">{selected.machine_serial || '-'}</Descriptions.Item>
              <Descriptions.Item label="问题类型">{issueLabel[selected.issue_type] || selected.issue_type}</Descriptions.Item>
              <Descriptions.Item label="紧急程度"><Tag color={urgencyColor[selected.urgency]}>{urgencyLabel[selected.urgency]}</Tag></Descriptions.Item>
              <Descriptions.Item label="问题描述">{selected.issue_description}</Descriptions.Item>
              <Descriptions.Item label="备注">{selected.notes || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={statusColor[selected.status]}>{statusLabel[selected.status]}</Tag></Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5} style={{ marginTop: 16 }}>处理备注</Typography.Title>
            <Form form={form} layout="vertical" onFinish={onSaveNotes}>
              <Form.Item name="handled_notes">
                <Input.TextArea rows={4} placeholder="填写处理情况、解决方案等" />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">保存备注</Button>
                  <Select
                    value={selected.status}
                    style={{ width: 120 }}
                    onChange={(v) => onStatusChange(selected.id, v)}
                    options={[
                      { value: 'pending', label: '待处理' },
                      { value: 'in_progress', label: '处理中' },
                      { value: 'resolved', label: '已解决' },
                      { value: 'closed', label: '已关闭' },
                    ]}
                  />
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Drawer>
    </div>
  )
}
