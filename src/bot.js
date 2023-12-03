import makeWASocket, {useMultiFileAuthState, DisconnectReason} from "@whiskeysockets/baileys"
import "colors"
import {inspect} from 'util'
import fs from 'fs'
import similarity from 'similarity'

const AUTH_STATE_PATH = 'data/state'
const DEFAULT_SIMILARITY_THRESHOLD = .5

const programs = []
const defaultPrograms = []
const testingMode = process.argv[2] == 'testing'

let socket

export async function start() {
    console.log("Starting Bot...".green)

    if (testingMode) {
        console.log("-- TESTING MODE --".yellow)
        process.stdin.on('data', async data => {
            const text = data.toString().trim()
            const progs = findPrograms(text)
            if (!progs.length) {
                for (let d of defaultPrograms) {
                    await console.log(d.output)
                }
            }
            for (let p of progs) {
                await console.log(p.output)
            }
        })
        return
    }

    const {state, saveCreds} = await useMultiFileAuthState(AUTH_STATE_PATH)

    socket = makeWASocket.default({
        printQRInTerminal: true,
        auth: state,
    })

    socket.ev.on('creds.update', saveCreds)

    socket.ev.on('connection.update', update => {
        console.log(inspect(update,null,7).blue)
        if (update.connection == 'close') {
            const reason = update.lastDisconnect?.error?.output?.statusCode
            if (reason == '401') { // Unauthorized
                console.log('Unauthorized. Removing state data...'.red)
                fs.rmSync(AUTH_STATE_PATH, {recursive:true})
                //start()
            }
            else if (reason != DisconnectReason.loggedOut) {
                socket = null
                start()
            }
        }
    })

    socket.ev.on('messages.upsert', async update => {
        console.log(inspect(update,null,10).green)
        for (let message of update.messages) {
            if (message?.key?.fromMe) return
            const text = message?.message?.conversation
            const progs = findPrograms(text)
            const room = message?.key?.remoteJid
            if (!progs.length) {
                for (let d of defaultPrograms) {
                    if (typeof d.output == 'string') return await socket.sendMessage(room, {text:d.output})
                }
            }
            for (let p of progs) {
                if (typeof p.output == 'string') await socket.sendMessage(message?.key?.remoteJid, {text:p.output})
                if (p.output?.image) return await socket.sendMessage(room, {image:{url:p.output.image}})
            }
        }
    })
}

class ProgramRegistration {

    constructor (input, options) {
        this.input = input
        this.options = options
        this.reply.image = link => {
            addProgram(this.input, {image:link}, this.options)
        }
    }
    
    reply (output) {
        addProgram(this.input, output, this.options)
    }
}

export const receive = (input) => {
    return new ProgramRegistration(input)
}
receive.similar = (input, similarityThreshold) => {
    return new ProgramRegistration(input, {similarityThreshold})
}
receive.default = {
    reply: output => {
        addDefault(output)
    }
}

function addProgram(input, output, options) {
    programs.push({input, output, options})
}

function addDefault(output) {
    defaultPrograms.push({output})
}

function findPrograms(input) {
    const p = programs.filter(program => program.input == input || (program.options?.similarityThreshold && similarity(input, program.input) >= program?.options?.similarityThreshold))
    //console.log(p)
    return p
}