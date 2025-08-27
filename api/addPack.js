import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://whxmfpdmnsungcwlffdx.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8";
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { name, tags, colors, filename } = req.body;

    const { data, error } = await supabase
      .from("packs")
      .insert([{ name, tags, colors, filename }]);

    if (error) return res.status(400).json({ status: error.message });
    res.status(200).json({ status: "Pack added!" });
  } else {
    res.status(405).json({ status: "Method not allowed" });
  }
}
