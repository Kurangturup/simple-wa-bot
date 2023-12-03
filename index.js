import * as bot from './src/bot.js'

bot.receive('Halo').reply('Halo kaka')
bot.receive.similar('Assalamualaikum').reply('Waalaikumussalam')
bot.receive.similar('Apa kabar?', .8).reply('Baik kaka')
bot.receive('kucing').reply.image('https://cataas.com/cat')
// bot.receive.default.reply('Maaf gak ngerti')

bot.start()