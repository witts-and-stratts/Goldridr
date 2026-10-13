import React from "react";
import { emailComponentFor } from "./components";
import {
  Body,
  Button,
  Column,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import { getBookingQrImageUrl, getBookingVerifyUrl } from "@/lib/booking-qr";
import { getAppUrl } from "@/lib/admin-settings";
import {
  emailDefaultContent,
  emailKey,
  emailLayout,
  RIDER_TRIP_EMAIL_TEMPLATES,
  type BookingSummary,
  type EmailLayout,
} from "./defaults";
import { stringValue } from "@/lib/notifications/template-context";
import type { EmailEditableContent } from "@/lib/notifications/template-types";
import { getEmailConfig } from "@/lib/notifications/config";
import type { RenderedEmail } from "@/lib/notifications/types";

export interface EmailContent extends EmailEditableContent, EmailLayout {
  booking?: BookingSummary;
  riderQr?: { reference: string; imageUrl: string; verifyUrl: string };
  trackingPixelUrl?: string;
}

async function contentFor(
  templateId: string,
  payload: Record<string, unknown>,
  editable?: EmailEditableContent | null,
): Promise<EmailContent> {
  const appUrl = stringValue(payload.appUrl) || (await getAppUrl());
  return {
    ...(editable || emailDefaultContent(templateId, payload)),
    ...emailLayout(templateId, payload, appUrl),
  };
}

const colors = {
  black: "#050505",
  surface: "#10100f",
  surfaceRaised: "#1a1a18",
  gold: "#c29e66",
  ivory: "#f7f4ed",
  softIvory: "#cdc9c0",
  muted: "#aaa69d",
  rule: "#3a3935",
  paper: "#f7f7f5",
  paperInk: "#171715",
  paperMuted: "#6a6a65",
  paperLabel: "#54544f",
  paperReference: "#73736c",
  headerGold: "#c29e66",
};

const type = {
  body: "15px",
  compact: "13px",
  micro: "11px",
  total: "21px",
  display: "42px",
  heading: "34px",
};
const labelStyle = {
  color: colors.muted,
  fontFamily: "Engravers Gothic BT, Arial, sans-serif",
  fontSize: "10px",
  fontWeight: "600",
  letterSpacing: "1.6px",
  lineHeight: "15px",
  margin: "0",
  textTransform: "uppercase" as const,
};

function Detail({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string;
  align?: "left" | "right";
}) {
  return (
    <Column align={align} style={{ verticalAlign: "top" }}>
      <Text style={labelStyle}>{label}</Text>
      <Text
        style={{
          color: colors.ivory,
          fontFamily: "Epilogue, Arial, sans-serif",
          fontSize: type.body,
          fontWeight: "600",
          lineHeight: "22px",
          margin: "6px 0 0",
        }}
      >
        {value}
      </Text>
    </Column>
  );
}

function BookingCard({
  booking,
  assetUrl,
}: {
  booking: NonNullable<EmailContent["booking"]>;
  assetUrl: string;
}) {
  const details = [
    booking.passengers ? ["Passengers", booking.passengers] : null,
    booking.flightNumber ? ["Flight", booking.flightNumber] : null,
    booking.terminal ? ["Terminal", booking.terminal] : null,
    booking.duration ? ["Duration", booking.duration] : null,
  ].filter(Boolean) as Array<[string, string]>;
  return (
    <Section
      style={{
        backgroundColor: colors.surfaceRaised,
        marginTop: "32px",
      }}
    >
      <Section
        style={{
          borderBottom: `1px solid ${colors.rule}`,
          padding: "20px 22px",
        }}
      >
        <Row>
          <Detail label="Reservation" value={booking.reference} />
          <Column align="right" style={{ verticalAlign: "bottom" }}>
            <Text style={{ ...labelStyle, color: colors.gold }}>
              {booking.statusLabel}
            </Text>
          </Column>
        </Row>
      </Section>
      <Section style={{ padding: "24px 22px 20px" }}>
        <Text style={{ ...labelStyle, color: colors.gold, margin: "0 0 20px" }}>
          {booking.service}
        </Text>
        <Row>
          <Column style={{ width: "62%", verticalAlign: "top" }}>
            <Detail label="Date" value={booking.date} />
          </Column>
          <Column align="right" style={{ width: "38%", verticalAlign: "top" }}>
            <Detail label="Pickup" value={booking.time} align="right" />
          </Column>
        </Row>
      </Section>
      <Hr style={{ borderColor: colors.rule, margin: "0 22px" }} />
      <Section style={{ padding: "22px" }}>
        <Row>
          <Column style={{ verticalAlign: "top", width: "34px" }}>
            <Img
              src={`${assetUrl}/assets/images/email-pickup-marker.webp`}
              alt=""
              width="22"
              height="22"
              style={{ display: "block" }}
            />
          </Column>
          <Column style={{ verticalAlign: "top" }}>
            <Text style={labelStyle}>Pickup location</Text>
            <Text
              style={{
                color: colors.softIvory,
                fontFamily: "Epilogue, Arial, sans-serif",
                fontSize: "14px",
                lineHeight: "22px",
                margin: "7px 0 0",
              }}
            >
              {booking.pickup}
            </Text>
          </Column>
        </Row>
        {booking.dropoff ? (
          <>
            <Hr style={{ borderColor: colors.rule, margin: "18px 0" }} />
            <Row>
              <Column style={{ verticalAlign: "top", width: "34px" }}>
                <Img
                  src={`${assetUrl}/assets/images/email-dropoff-marker.webp`}
                  alt=""
                  width="22"
                  height="22"
                  style={{ display: "block" }}
                />
              </Column>
              <Column style={{ verticalAlign: "top" }}>
                <Text style={labelStyle}>Destination</Text>
                <Text
                  style={{
                    color: colors.softIvory,
                    fontFamily: "Epilogue, Arial, sans-serif",
                    fontSize: "14px",
                    lineHeight: "22px",
                    margin: "7px 0 0",
                  }}
                >
                  {booking.dropoff}
                </Text>
              </Column>
            </Row>
          </>
        ) : null}
      </Section>
      {details.length ? (
        <>
          <Hr style={{ borderColor: colors.rule, margin: "0 22px" }} />
          <Section style={{ padding: "20px 22px" }}>
            <Row>
              {details.map(([label, value]) => (
                <Column
                  key={label}
                  style={{ paddingRight: "8px", verticalAlign: "top" }}
                >
                  <Text style={labelStyle}>{label}</Text>
                  <Text
                    style={{
                      color: colors.ivory,
                      fontFamily: "Epilogue, Arial, sans-serif",
                      fontSize: type.compact,
                      fontWeight: "600",
                      lineHeight: "20px",
                      margin: "6px 0 0",
                    }}
                  >
                    {value}
                  </Text>
                </Column>
              ))}
            </Row>
          </Section>
        </>
      ) : null}
      {booking.notes ? (
        <>
          <Hr style={{ borderColor: colors.rule, margin: "0 22px" }} />
          <Section style={{ padding: "20px 22px" }}>
            <Text style={labelStyle}>Special requests</Text>
            <Text
              style={{
                color: colors.softIvory,
                fontFamily: "Epilogue, Arial, sans-serif",
                fontSize: "14px",
                lineHeight: "22px",
                margin: "7px 0 0",
              }}
            >
              {booking.notes}
            </Text>
          </Section>
        </>
      ) : null}
      {booking.estimate ? (
        <Section
          style={{ backgroundColor: colors.paper, padding: "18px 22px" }}
        >
          <Row>
            <Column>
              <Text
                style={{
                  color: colors.paperMuted,
                  fontFamily: "Epilogue, Arial, sans-serif",
                  fontSize: "12px",
                  margin: 0,
                }}
              >
                Estimated total
              </Text>
            </Column>
            <Column align="right">
              <Text
                style={{
                  color: colors.paperInk,
                  fontFamily: "Epilogue, Arial, sans-serif",
                  fontSize: type.total,
                  fontWeight: "600",
                  letterSpacing: "-0.4px",
                  margin: 0,
                }}
              >
                {booking.estimate}
              </Text>
            </Column>
          </Row>
        </Section>
      ) : null}
    </Section>
  );
}

function RiderQrCode({ qr }: { qr: NonNullable<EmailContent["riderQr"]> }) {
  return (
    <Section
      style={{
        backgroundColor: colors.paper,
        marginTop: "28px",
        padding: "26px 22px",
        textAlign: "center",
      }}
    >
      <Text
        style={{
          color: colors.paperLabel,
          fontFamily: "Engravers Gothic BT, Arial, sans-serif",
          fontSize: "10px",
          fontWeight: "600",
          letterSpacing: "1.6px",
          margin: "0 0 14px",
          textTransform: "uppercase",
        }}
      >
        Your journey pass
      </Text>
      <Link
        href={qr.verifyUrl}
        style={{ display: "inline-block", textDecoration: "none" }}
      >
        <Img
          src={qr.imageUrl}
          alt={`QR code for booking ${qr.reference}`}
          width="160"
          height="160"
          style={{ display: "block", margin: "0 auto" }}
        />
      </Link>
      <Text
        style={{
          color: colors.paperInk,
          fontFamily: "Epilogue, Arial, sans-serif",
          fontSize: type.compact,
          lineHeight: "20px",
          margin: "15px 0 0",
        }}
      >
        Show this code to your chauffeur, or tap it to open your trip.
      </Text>
      <Text
        style={{
          color: colors.paperReference,
          fontFamily: "Epilogue, Arial, sans-serif",
          fontSize: type.micro,
          letterSpacing: "0.5px",
          margin: "7px 0 0",
        }}
      >
        {qr.reference}
      </Text>
    </Section>
  );
}

export function GoldridrEmail({ content }: { content: EmailContent }) {
  const assetUrl = content.appUrl.replace(/\/$/, "");
  const fontUrl = `${assetUrl}/assets/fonts`;
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Epilogue"
          fallbackFontFamily={["Arial", "Helvetica", "sans-serif"]}
          webFont={{
            url: `${fontUrl}/Epilogue-Regular.woff2`,
            format: "woff2",
          }}
        />
        <Font
          fontFamily="Engry"
          fallbackFontFamily={["Georgia", "Times New Roman", "serif"]}
          webFont={{ url: `${fontUrl}/engry.woff2`, format: "woff2" }}
        />
        <Font
          fontFamily="Engravers Gothic BT"
          fallbackFontFamily={["Arial", "Helvetica", "sans-serif"]}
          webFont={{
            url: `${fontUrl}/EngraversGothic-BT.woff2`,
            format: "woff2",
          }}
        />
      </Head>
      <Preview>
        {content.preview || "GoldRidr private chauffeur service"}
      </Preview>
      <Body
        style={{
          backgroundColor: colors.black,
          fontFamily: "Epilogue, Arial, sans-serif",
          margin: 0,
          padding: "32px 12px",
        }}
      >
        <Container
          style={{
            backgroundColor: colors.surface,
            margin: "0 auto",
            maxWidth: "600px",
          }}
        >
          <Section
            style={{
              backgroundColor: colors.black,
              padding: "22px 28px",
            }}
          >
            <Row>
              <Column>
                <Img
                  src={`${assetUrl}/assets/images/email-brand-logo.webp`}
                  alt="GoldRidr"
                  width="173"
                  height="36"
                  style={{ display: "block" }}
                />
              </Column>
              <Column align="right" style={{ verticalAlign: "middle" }}>
                <Text style={{ ...labelStyle, color: colors.headerGold }}>
                  Private chauffeur service
                </Text>
              </Column>
            </Row>
          </Section>
          <Section style={{ padding: "40px 28px 36px" }}>
            <Text
              style={{
                color: colors.gold,
                fontFamily: "Engravers Gothic BT, Arial, sans-serif",
                fontSize: "10px",
                fontWeight: "600",
                letterSpacing: "1.8px",
                margin: "0 0 18px",
                textTransform: "uppercase",
              }}
            >
              Your journey, considered
            </Text>
            <Heading
              style={{
                color: colors.ivory,
                fontFamily: "Epilogue, Arial, sans-serif",
                fontSize: type.heading,
                fontWeight: "600",
                letterSpacing: "-1px",
                lineHeight: "40px",
                margin: "0 0 18px",
              }}
            >
              {content.heading || "GoldRidr"}
            </Heading>
            <Text
              style={{
                color: colors.softIvory,
                fontFamily: "Epilogue, Arial, sans-serif",
                fontSize: type.body,
                lineHeight: "25px",
                margin: 0,
              }}
            >
              {content.message}
            </Text>
            {content.booking ? (
              <BookingCard booking={content.booking} assetUrl={assetUrl} />
            ) : null}
            {content.details?.length ? (
              <Section
                style={{
                  borderTop: `1px solid ${colors.rule}`,
                  borderBottom: `1px solid ${colors.rule}`,
                  marginTop: "28px",
                  padding: "10px 0",
                }}
              >
                {content.details.map(([label, value]) => (
                  <Text
                    key={label}
                    style={{
                      color: colors.softIvory,
                      fontFamily: "Epilogue, Arial, sans-serif",
                      fontSize: "14px",
                      lineHeight: "22px",
                      margin: "10px 0",
                    }}
                  >
                    <strong style={{ color: colors.ivory, fontWeight: "600" }}>
                      {label}
                    </strong>
                    <span style={{ color: colors.gold }}> · </span>
                    {value}
                  </Text>
                ))}
              </Section>
            ) : null}
            {content.riderQr ? <RiderQrCode qr={content.riderQr} /> : null}
            {content.ctaUrl ? (
              <Button
                href={content.ctaUrl}
                style={{
                  backgroundColor: colors.gold,
                  color: colors.black,
                  display: "inline-block",
                  fontFamily: "Engravers Gothic BT, Arial, sans-serif",
                  fontSize: type.micro,
                  fontWeight: "600",
                  letterSpacing: "1.3px",
                  marginTop: "28px",
                  padding: "16px 20px",
                  textDecoration: "none",
                  textTransform: "uppercase",
                }}
              >
                {content.ctaLabel || "Open booking"}
              </Button>
            ) : null}
          </Section>
          <Section
            style={{
              backgroundColor: colors.surfaceRaised,
              padding: "24px 28px",
            }}
          >
            <Text
              style={{
                color: colors.ivory,
                fontFamily: "Epilogue, Arial, sans-serif",
                fontSize: "12px",
                fontWeight: "600",
                margin: 0,
              }}
            >
              GoldRidr
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: "Epilogue, Arial, sans-serif",
                fontSize: type.micro,
                lineHeight: "18px",
                margin: "6px 0 0",
              }}
            >
              {content.footerNote ||
                "A considered journey, from the first confirmation to your arrival."}
            </Text>
          </Section>
        </Container>
        {content.trackingPixelUrl ? (
          <Img
            src={content.trackingPixelUrl}
            alt=""
            width="1"
            height="1"
            style={{ display: "block", height: "1px", width: "1px" }}
          />
        ) : null}
      </Body>
    </Html>
  );
}

function withQr(
  templateId: string,
  content: EmailContent,
  reference: string,
  passengerEmail: string,
): EmailContent {
  if (!RIDER_TRIP_EMAIL_TEMPLATES.has(emailKey(templateId)) || !reference)
    return content;
  return {
    ...content,
    riderQr: {
      reference,
      imageUrl: getBookingQrImageUrl(content.appUrl, reference, passengerEmail),
      verifyUrl: getBookingVerifyUrl(content.appUrl, reference, passengerEmail),
    },
  };
}

export async function renderEmailPreview(
  templateId: string,
  payload: Record<string, unknown>,
  editable?: EmailEditableContent | null,
): Promise<{ subject: string; preview: string; html: string; text: string }> {
  const baseContent = await contentFor(templateId, payload, editable);
  const reference = stringValue(payload.bookingReference);
  const content = withQr(
    templateId,
    baseContent,
    reference,
    stringValue(payload.passengerEmail) || "passenger@example.com",
  );
  const Template = emailComponentFor(templateId);
  const element = <Template content={content} />;
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);
  return {
    subject: content.subject || "",
    preview: content.preview || "",
    html,
    text,
  };
}

export async function renderNotificationEmail(
  templateId: string,
  recipient: string,
  payload: Record<string, unknown>,
  idempotencyKey: string,
  trackingPixelUrl?: string,
  editable?: EmailEditableContent | null,
): Promise<RenderedEmail> {
  const config = await getEmailConfig();
  const baseContent = await contentFor(templateId, payload, editable);
  const content = withQr(
    templateId,
    baseContent,
    stringValue(payload.bookingReference),
    stringValue(payload.passengerEmail) || recipient,
  );
  const Template = emailComponentFor(templateId);
  const element = <Template content={{ ...content, trackingPixelUrl }} />;
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);
  return {
    from: `${config.fromName} <${config.fromAddress}>`,
    replyTo: config.replyTo,
    to: [recipient],
    subject: content.subject || "",
    html,
    text,
    tags: {
      notification_id: String(payload.notificationId || ""),
      booking_reference: String(payload.bookingReference || ""),
    },
    idempotencyKey,
  };
}
