export default function handler(req, res) {
  console.log("PING WORKS");
  res.status(200).json({ ok: true });
}
