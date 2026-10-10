import {defineConfig} from 'vite';
import {createReadStream,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Optional user-owned reference art is served only by the local development
// server. Nothing from reference-analysis is copied into production builds.
export default defineConfig({server:{proxy:{'/api':{target:'http://127.0.0.1:8787',changeOrigin:true,configure(proxy){proxy.on('proxyReq',(out,req)=>{if(req.headers.origin)out.setHeader('Origin','http://127.0.0.1:8787')})}}}},plugins:[{
 name:'local-football-reference',apply:'serve',
 configureServer(server){
  const files={
   '/local-reference/fps-decoded.json':['fps-decoded.json','application/json'],
   '/local-reference/fps-sprite-atlas.png':['fps-sprite-atlas.png','image/png'],
  };
  server.middlewares.use((req,res,next)=>{
   const entry=files[req.url?.split('?')[0]];
   if(!entry)return next();
   const path=fileURLToPath(new URL(`../reference-analysis/${entry[0]}`,import.meta.url));
   if(!existsSync(path)){res.statusCode=404;res.end();return}
   res.setHeader('Content-Type',entry[1]);res.setHeader('Cache-Control','no-cache');
   createReadStream(path).on('error',()=>{res.destroy()}).pipe(res);
  });
 }
}]});
