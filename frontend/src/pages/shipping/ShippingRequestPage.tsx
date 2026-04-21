import { useState } from 'react'
import { Form, Input, Button, Card, message, Result, Typography, Switch, Divider } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { shippingApi } from '../../api'

export default function ShippingRequestPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const isInternational = Form.useWatch('is_international', form)
  const hasBattery = Form.useWatch('has_battery', form)

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      await shippingApi.submitRequest({
        requester_name: values.requester_name,
        requester_contact: values.requester_contact,
        destination: values.destination,
        is_international: values.is_international ?? false,
        items_tools: values.items_tools,
        items_accessories: values.items_accessories,
        items_components: values.items_components,
        has_battery: values.has_battery ?? false,
        battery_international_ok: values.battery_international_ok ?? false,
        notes: values.notes,
      })
      setSubmitted(true)
    } catch (e: any) {
      message.error(e.response?.data?.detail || '提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', padding: 16 }}>
        <Result
          status="success"
          title="发货需求提交成功！"
          subTitle="管理员将尽快处理您的发货需求。"
          extra={<Button onClick={() => { setSubmitted(false); form.resetFields() }}>再次提交</Button>}
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
      <Card style={{ width: '100%', maxWidth: 600 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <InboxOutlined style={{ fontSize: 40, color: '#1677ff' }} />
          <Typography.Title level={4} style={{ marginTop: 8 }}>发货需求申请</Typography.Title>
          <Typography.Text type="secondary">填写发货信息，管理员将安排发货</Typography.Text>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark="optional">
          <Form.Item label="申请人姓名" name="requester_name" rules={[{ required: true }]}>
            <Input placeholder="您的姓名" />
          </Form.Item>
          <Form.Item label="联系方式" name="requester_contact">
            <Input placeholder="手机号或邮箱" />
          </Form.Item>

          <Divider orientation="left" style={{ fontSize: 14 }}>收货信息</Divider>

          <Form.Item label="收货地址" name="destination" rules={[{ required: true, message: '请填写收货地址' }]}>
            <Input.TextArea rows={2} placeholder="详细收货地址" />
          </Form.Item>

          <Form.Item label="是否发往国外" name="is_international" valuePropName="checked" initialValue={false}>
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

          <Divider orientation="left" style={{ fontSize: 14 }}>发货物品清单</Divider>

          <Form.Item label="工具" name="items_tools">
            <Input.TextArea rows={2} placeholder="工具清单（型号、数量）" />
          </Form.Item>
          <Form.Item label="配件" name="items_accessories">
            <Input.TextArea rows={2} placeholder="配件清单（名称、数量）" />
          </Form.Item>
          <Form.Item label="组件" name="items_components">
            <Input.TextArea rows={2} placeholder="组件清单（名称、数量）" />
          </Form.Item>

          <Divider orientation="left" style={{ fontSize: 14 }}>电池信息</Divider>

          <Form.Item label="是否含电池" name="has_battery" valuePropName="checked" initialValue={false}>
            <Switch checkedChildren="含电池" unCheckedChildren="不含" />
          </Form.Item>

          {hasBattery && isInternational && (
            <Form.Item label="电池是否可以发国外" name="battery_international_ok" valuePropName="checked" initialValue={false}>
              <Switch checkedChildren="可以" unCheckedChildren="不确定" />
            </Form.Item>
          )}

          <Divider />

          <Form.Item label="其他备注" name="notes">
            <Input.TextArea rows={3} placeholder="其他特殊要求" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>提交发货需求</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
