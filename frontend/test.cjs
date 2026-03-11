const https = require('https');
https.get('https://toll-claim-billing.vercel.app/', (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const jsMatch = body.match(/src=\"(\/assets\/.*?.js)\"/);
    if(jsMatch) {
      https.get('https://toll-claim-billing.vercel.app' + jsMatch[1], (jsRes) => {
        let jsBody = '';
        jsRes.on('data', d => jsBody += d);
        jsRes.on('end', () => {
           console.log('JS length:', jsBody.length);
           console.log('VITE API URL Match:', jsBody.match(/"http[^"]+"|\'http[^\']+\'/g).filter(x => x.includes('api') || /localhost/.test(x)));
        })
      });
    } else { console.log('not found js') }
  });
});
