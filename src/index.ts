import REPL = require('repl')

declare module 'repl' {
    interface REPLServer {
        eval: (cmd: string, ctx: any, filename: string, callback: (error?: any, result?: any) => void) => void
        completer: (line: string, callback: (error: any, out?: [string[], string]) => void) => void    
    }
}

export interface ServerX extends REPL.REPLServer {  
    q(query: string): Promise<string>
}

export function start(options?: string | REPL.ReplOptions): ServerX {
    const server = REPL.start(options) as ServerX

    // promisfied question
    server.q = (query) => {
        return new Promise<string>(resolve => {
            server.question(query, resolve)
        })
    }

    const suffixesToSkip = Object.getOwnPropertyNames(Object.prototype).map(n => '.' + n)
    const globalNames = [
        ...Object.getOwnPropertyNames(server.context),
        ...Object.getOwnPropertyNames(global),
        ...Object.getOwnPropertyNames(Object.prototype)
    ]

    const shouldSkipAutoCompletion = (s: string) => {
        if (s.indexOf('.') < 0) {
            return globalNames.indexOf(s) >= 0
        }
        return suffixesToSkip.some(n => s.endsWith(n))
    }

    // override completer
    const originalCompleter = server.completer
    server.completer = (line, callback) => {
        originalCompleter.call(server, line, (err: any, out: [string[], string]) => {
            if (err) {
                return callback(err)
            }
            callback(null, [out[0].filter(i => !shouldSkipAutoCompletion(i)), out[1]])
        })
    }

    // override eval to support Promise    
    const originalEval = server.eval;
    server.eval = (cmd, ctx, filename, callback) => {
        let awaitFlag = false
        cmd = cmd.trimLeft()
        if (cmd.startsWith('@')) {
            cmd = cmd.substr(1).trimLeft()
            awaitFlag = true
        }
        if (cmd.length === 0) {
            return callback()
        }

        if (awaitFlag) {
            originalEval.call(server, cmd, ctx, filename, async (err?: any, result?: any) => {
                if (err) {
                    return callback(err)
                }
                const listeners = server.listeners('line')
                server.removeAllListeners('line')
                try {
                    callback(undefined, await result)
                } catch (e) {
                    callback(e)
                } finally {
                    listeners.forEach(l => server.addListener('line', l as any))
                }
            })
        } else {
            originalEval.call(server, cmd, ctx, filename, callback)
        }
    }
    return server
}
