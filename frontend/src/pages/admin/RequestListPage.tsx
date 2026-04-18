import { useEffect, useState } from 'react'
import { Table, Tag, Button, Modal, Select, message, Space, Descriptions } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { marketingApi, machinesApi } from '../../api'

const statusColor: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red', completed: 'default' }
const statusLabel: Record<string, string> = { pending: '待审批', approved: '已批准', rejected: '已拒绝', completed: '已完成' }

export default function RequestListPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [selectedMachines, setSelectedMachines] = useState<string[]>([])

  const load = async () => {
    setLoading(true)
    const [rRes, mRes] = await Promise.all([marketingApi.listRequests(), machinesApi.list()])
    setRequests(rRes.data)
    setMachines(mRes.data.filter((m: any) => m.status === 'idle'))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const onApprove = async () => {
    if (selectedMachines.length < selected.quantity_needed) {
      message.warning(`需要分配 ${selected.quantity_needed} 台机器`)
      return
    }
    await marketingApi.reviewRequest(selected.id, { status: 'approved', machine_ids: selectedMachines })
    message.success('已批准')
    setSelected(null)
    load()
  }

  const onReject = async (id: string) => {
    await marketingApi.reviewRequest(id, { status: 'rejected' })
    message.success('已拒绝')
    load()
  }

  const columns = [
    { title: '申请人', dataIndex: 'requester_name' },
    { title: '活动', dataIndex: 'event_name', ellipsis: true },
    { title: '地点', dataIndex: 'location' },
    { title: '日期', render: (_: any, r: any) => `${r.start_date} ~ ${r.end_date}` },
    { title: '数量', dataIndex: 'quantity_needed' },
    { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag> },
    {
      title: '操作',
      render: (_: any, record: any) =>
        record.status === 'pending' ? (
          <Space>
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => { setSelected(record); setSelectedMachines([]) }}>审批</Button>
            <Button size="small" danger icon={<CloseOutlined />} onClick={() => onReject(record.id)}>拒绝</Button>
          </Space>
        ) : null,
    },
  ]

  return (
    <div>
      <h2>市场需求申请</h2>
      <Table dataSource={requests} columns={columns} rowKey="id" loading={loading} scroll={{ x: true }} />

      <Modal
        title="审批申请"
        open={!!selected}
        onCancel={() => setSelected(null)}
        onOk={onApprove}
        okText="批准并分配"
      >
        {selected && (
          <>
            <Descriptions size="small" bordered column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="活动">{selected.event_name}</Descriptions.Item>
              <Descriptions.Item label="地点">{selected.location}</Descriptions.Item>
              <Descriptions.Item label="日期">{selected.start_date} ~ {selected.end_date}</Descriptions.Item>
              <Descriptions.Item label="需要数量">{selected.quantity_needed} 台</Descriptions.Item>
            </Descriptions>
            <p>选择要分配的机器（当前空闲机器）：</p>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="选择机器"
              value={selectedMachines}
              onChange={setSelectedMachines}
              options={machines.map((m: any) => ({ value: m.id, label: `${m.serial_number} (${m.model})` }))}
            />
          </>
        )}
      </Modal>
    </div>
  )
}
