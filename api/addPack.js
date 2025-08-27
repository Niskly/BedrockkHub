import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';

export const config = { api: { bodyParser: false } };

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files)=>{
    if(err) return res.status(500).json({error:err.message});
    const { name, tags, id } = fields;
    const file = files.file;
    let filename=null;
    
    if(file){
      const raw=await fs.promises.readFile(file.filepath);
      filename=file.originalFilename;
      await supabase.storage.from('packs').upload(filename, raw, {upsert:true});
    }
    
    const colors='#7c3aed'; // default color
    if(id){
      const updates = { name, tags, colors };
      if(filename) updates.filename=filename;
      const { error } = await supabase.from('packs').update(updates).eq('id',id);
      if(error) return res.status(500).json({error:error.message});
      return res.status(200).json({status:'updated'});
    } else {
      const { data, error } = await supabase.from('packs').insert({ name, tags, colors, filename });
      if(error) return res.status(500).json({error:error.message});
      return res.status(200).json({status:'added',data});
    }
  });
}
