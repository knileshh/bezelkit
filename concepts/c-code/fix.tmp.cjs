const fs=require('fs');let s=fs.readFileSync('index.html','utf8');
const rep=(a,b)=>{ if(!s.includes(a)) throw new Error('miss '+a); s=s.split(a).join(b); };
rep("About 30 kB unminified, with no runtime dependencies. It works with Markdown and MDX docs sites, and in Webflow or Framer embeds.", "One ES module with no runtime dependencies. It also works in Markdown and MDX docs sites, and in Webflow or Framer embeds.");
rep("|(<\/?[a-zA-Z][\w-]*|\/?>)|", "|(<\/?[a-zA-Z][\w-]*|(?<!=)\/?>(?!\s*\d))|");
fs.writeFileSync('index.html',s);
