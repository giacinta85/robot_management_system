import { useEffect, useState } from 'react'
import { Table, Tag, Button, Select, Space, Upload, message, Popconfirm, Typography, Drawer, Descriptions } from 'antd'
import { UploadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import { shippingApi } from '../../api'

const statusLabel: Record<string, string> = { pending: '待处理', processing: '处理中', shipped: '已发货', cancelled: '已取消' }
const statusColor: Record<string, string> = { pending: 'orange', processing: 'blue', shipped: 'green', cancelled: 'default' }

export default function ShippingListPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  const load = async () => {
    setLoading(true)
    const r = await shippingApi.listRequests()
    setData(r.data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const onStatusChange = async (id: string, status: string) => {
    await shippingApi.updateStatus(id, status)
    message.success('状态已更新')
    load()
    // refresh selected
    if (selected?.id === id) setSelected((prev: any) => ({ ...prev, status }))
  }

  const onUpload = async (file: File, record: any) => {
    try {
      const res = await shippingApi.uploadAttachment(record.id, file)
      message.success(`${file.name} 上传成功`)
      load()
      if (selected?.id === record.id) {
        const updated = (await shippingApi.listRequests()).data.find((r: any) => r.id === record.id)
        setSelected(updated)
      }
    } catch {
      message.error('上传失败')
    }
    return false  // prevent default upload
  }

  const onDeleteAttachment = async (record: any, url: string) => {
    await shippingApi.deleteAttachment(record.id, url)
    message.success('已删除')
    load()
    if (selected?.id === record.id) {
      const updated = (await shippingApi.listRequests()).data.find((r: any) => r.id === record.id)
      setSelected(updated)
    }
  }

  const columns = [
    { title: '申请人', dataIndex: 'requester_name', width: 100 },
    { title: '联系方式', dataIndex: 'requester_contact', width: 120, render: (v: string) => v || '-' },
    { title: '收货地址', dataIndex: 'destination', ellipsis: true },
    { title: '国际', dataIndex: 'is_international', width: 60, render: (v: boolean) => v ? <Tag color="blue">是</Tag> : '-' },
    { title: '含电池', dataIndex: 'has_battery', width: 70, render: (v: boolean) => v ? <Tag color="orange">是</Tag> : '-' },
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
            { value: 'processing', label: '处理中' },
            { value: 'shipped', label: '已发货' },
            { value: 'cancelled', label: '已取消' },
          ]}
        />
      ),
    },
    {
      title: '操作', width: 120,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setSelected(r)}>详情</Button>
          <Upload showUploadList={false} beforeUpload={(file) => { onUpload(file, r); return false }}>
            <Button size="small" icon={<UploadOutlined />} />
          </Upload>
        </Space>
      ),
    },
  ]

  const attachments = selected ? JSON.parse(selected.attachments || '[]') : []

  return (
    <div>
      <h2>发货需求管理</h2>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} scroll={{ x: true }} />

      <Drawer
        title="发货需求详情"
        open={!!selected}
        onClose={() => setSelected(null)}
        width={560}
      >
        {selected && (
          <>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="申请人">{selected.requester_name}</Descriptions.Item>
              <Descriptions.Item label="联系方式">{selected.requester_contact || '-'}</Descriptions.Item>
              <Descriptions.Item label="收货地址">{selected.destination}</Descriptions.Item>
              <Descriptions.Item label="是否国际">{selected.is_international ? '是' : '否'}</Descriptions.Item>
              <Descriptions.Item label="工具">{selected.items_tools || '-'}</Descriptions.Item>
              <Descriptions.Item label="配件">{selected.items_accessories || '-'}</Descriptions.Item>
              <Descriptions.Item label="组件">{selected.items_components || '-'}</Descriptions.Item>
              <Descriptions.Item label="含电池">{selected.has_battery ? '是' : '否'}</Descriptions.Item>
              {selected.has_battery && selected.is_international && (
                <Descriptions.Item label="电池可发国外">{selected.battery_international_ok ? '是' : '不确定'}</Descriptions.Item>
              )}
              <Descriptions.Item label="备注">{selected.notes || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColor[selected.status]}>{statusLabel[selected.status]}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5} style={{ marginTop: 16 }}>附件</Typography.Title>
            {attachments.length === 0 ? (
              <Typography.Text type="secondary">暂无附件</Typography.Text>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {attachments.map((a: any) => (
                  <div key={a.url} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <a href={a.url} target="_blank" rel="noreferrer">{a.name}</a>
                    <Popconfirm title="确认删除附件？" onConfirm={() => onDeleteAttachment(selected, a.url)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </div>
                ))}
              </Space>
            )}
            <Upload
              showUploadList={false}
              beforeUpload={(file) => { onUpload(file, selected); return false }}
              style={{ marginTop: 12, display: 'block' }}
            >
              <Button icon={<UploadOutlined />} style={{ marginTop: 12 }}>上传附件</Button>
            </Upload>
          </>
        )}
      </Drawer>
    </div>
  )
}
