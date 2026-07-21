const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');

// Match each gift entity block
const blocks = html.match(/<div class="gifts-entity">[\s\S]*?<\/div>/g);
const gifts = {};

if (blocks) {
  blocks.forEach(block => {
    const nameMatch = block.match(/<h1[^>]*style="[^"]*color:\s*blue[^"]*"[^>]*>([^<]+)<\/h1>/);
    const idMatch = block.match(/ID:\s*(\d+)<\/h1>/);
    const costMatch = block.match(/Cost:\s*(\d+)<\/h1>/);
    const imgMatch = block.match(/<img src="([^"]+)"/);
    
    if (idMatch && nameMatch && costMatch) {
      const id = idMatch[1];
      const name = nameMatch[1].trim();
      const cost = parseInt(costMatch[1]);
      const image = imgMatch ? imgMatch[1] : '';
      gifts[id] = { id, name, cost, diamond_count: cost, image };
    }
  });
}

console.log('Total gifts:', Object.keys(gifts).length);
fs.writeFileSync(process.argv[3] || 'gifts.json', JSON.stringify(gifts, null, 2));
console.log('Saved!');
