export function getInboundConfig() {
  const inboundEmail =
    process.env.INBOUND_EMAIL_ADDRESS ?? "documents@inbound.passport.trade";
  const inboundEmailDomain = inboundEmail.split("@")[1] ?? "inbound.passport.trade";
  const whatsappNumber =
    process.env.INBOUND_WHATSAPP_NUMBER ??
    process.env.TWILIO_WHATSAPP_FROM?.replace("whatsapp:", "") ??
    "+14155238886";

  return {
    inboundEmail,
    inboundEmailDomain,
    whatsappNumber,
    whatsappDisplay: whatsappNumber.startsWith("+")
      ? whatsappNumber
      : `+${whatsappNumber}`,
  };
}
