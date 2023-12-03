import fs from 'fs'

await fs.promises.rm('./data/state', {recursive:true})