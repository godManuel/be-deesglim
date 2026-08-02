import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import mailConfig from './config/mail.config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(
    @Inject(mailConfig.KEY)
    private readonly mailConfiguration: ConfigType<typeof mailConfig>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.mailConfiguration.host,
      port: this.mailConfiguration.port,
      secure: this.mailConfiguration.secure,
      auth: this.mailConfiguration.user
        ? {
            user: this.mailConfiguration.user,
            pass: this.mailConfiguration.password,
          }
        : undefined,
    });
  }

  async sendOrderConfirmationEmail(email: string, order: any): Promise<void> {
    const subject = `Your DeesGlim Order ${order.orderNumber} Has Been Confirmed`;

    const itemsHtml = (order.items ?? [])
      .map(
        (item: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            ${item.name}
          </td>

          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            ${item.color ?? 'N/A'}
          </td>

          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            ${item.quantity}
          </td>

          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            ₦${Number(item.price).toLocaleString()}
          </td>
        </tr>
      `,
      )
      .join('');

    const html = `
    <div
      style="
        font-family: sans-serif;
        max-width: 600px;
        margin: 0 auto;
        color: #333;
      "
    >
      <h2>Order Confirmed 🎉</h2>

      <p>
        Thank you for shopping with DeesGlim!
        Your payment was successful and your order has been confirmed.
      </p>

      <div
        style="
          background: #f7f7f7;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        "
      >
        <p>
          <strong>Order Number:</strong>
          ${order.orderNumber}
        </p>

        <p>
          <strong>Payment Reference:</strong>
          ${order.paymentReference}
        </p>

        <p>
          <strong>Order Status:</strong>
          ${order.status}
        </p>
      </div>

      <h3>Order Items</h3>

      <table
        style="
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        "
      >
        <thead>
          <tr style="background: #f7f7f7;">
            <th style="padding: 10px; text-align: left;">
              Product
            </th>

            <th style="padding: 10px; text-align: left;">
              Color
            </th>

            <th style="padding: 10px; text-align: left;">
              Quantity
            </th>

            <th style="padding: 10px; text-align: left;">
              Price
            </th>
          </tr>
        </thead>

        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div
        style="
          background: #f7f7f7;
          padding: 20px;
          border-radius: 8px;
        "
      >
        <h3>Payment Summary</h3>

        <p>
          <strong>Subtotal:</strong>
          ₦${Number(order.subtotal ?? 0).toLocaleString()}
        </p>

        <p>
          <strong>Tax:</strong>
          ₦${Number(order.taxTotal ?? 0).toLocaleString()}
        </p>

        <p>
          <strong>Shipping:</strong>
          ₦${Number(order.shippingTotal ?? 0).toLocaleString()}
        </p>

        <p>
          <strong>Discount:</strong>
          ₦${Number(order.discountTotal ?? 0).toLocaleString()}
        </p>

        <hr />

        <p style="font-size: 18px;">
          <strong>Total:</strong>
          ₦${Number(order.total ?? 0).toLocaleString()}
        </p>
      </div>

      <p style="margin-top: 25px;">
        Your order has been received successfully. We will notify you
        when your order is processed and ready for delivery.
      </p>

      <p>
        Thank you for choosing DeesGlim.
      </p>

      <p style="color: #777; font-size: 13px;">
        If you have any questions about your order, please contact our
        customer support team.
      </p>
    </div>
  `;

    const text = `
Your DeesGlim order has been confirmed.

Order Number: ${order.orderNumber}
Payment Reference: ${order.paymentReference}
Status: ${order.status}

Order Items:
${(order.items ?? [])
  .map(
    (item: any) =>
      `- ${item.name} | Color: ${item.color ?? 'N/A'} | Quantity: ${
        item.quantity
      } | Price: ₦${Number(item.price).toLocaleString()}`,
  )
  .join('\n')}

Payment Summary:
Subtotal: ₦${Number(order.subtotal ?? 0).toLocaleString()}
Tax: ₦${Number(order.taxTotal ?? 0).toLocaleString()}
Shipping: ₦${Number(order.shippingTotal ?? 0).toLocaleString()}
Discount: ₦${Number(order.discountTotal ?? 0).toLocaleString()}
Total: ₦${Number(order.total ?? 0).toLocaleString()}

Thank you for choosing DeesGlim.
  `;

    try {
      await this.transporter.sendMail({
        from: this.mailConfiguration.from,
        to: email,
        subject,
        html,
        text,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send order confirmation email to ${email}`,
        error,
      );

      throw error;
    }
  }
}
