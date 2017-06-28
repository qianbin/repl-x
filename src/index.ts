#!/usr/bin/env node

import REPL = require('repl')

declare module 'repl' {
    interface REPLServer {
        context: any
        eval: (cmd: string, ctx: any, filename: string, callback: (error: any, result?: any) => void) => void
        completer: (line: string, callback: (error: any, out?: [string[], string]) => void) => void

        q(query: string): Promise<string>
    }
}

export function start(options: REPL.ReplOptions, obj: object) {
    const repl = REPL.start(options)

    // promisfied question
    repl.q = (query) => {
        return new Promise<string>(resolve => {
            repl.question(query, answer => {
                resolve(answer)
            })
        })
    }

    // override completer
    const propNames = Object.getOwnPropertyNames(obj)
    const skipSuffixes = Object.getOwnPropertyNames(Object.prototype).map(n => '.' + n)

    propNames.forEach(n => {
        const desc = { ...Object.getOwnPropertyDescriptor(obj, n) }
        delete desc.writable
        Object.defineProperty(repl.context, n, desc)
    })

    function shouldSkipAutoCompletion(s: string) {
        if (s.indexOf('.') < 0) {
            return propNames.indexOf(s) < 0
        }
        return skipSuffixes.some(n => s.endsWith(n))
    }

    const originCompleter = repl.completer;
    repl.completer = (line, callback) => {
        originCompleter.call(repl, line, (err: any, out: [string[], string]) => {
            if (err) return callback(err)
            callback(null, [out[0].filter(i => !shouldSkipAutoCompletion(i)), out[1]])
        })
    }

    //override eval to support Promise
    const originEval = repl.eval;
    repl.eval = (cmd, ctx, filename, callback) => {
        if (cmd.trim().length === 0)
            return callback(null)

        originEval.call(repl, cmd, ctx, filename, async (err: any, result: any) => {
            if (err)
                return callback(err)

            let resolvedResult
            try {
                resolvedResult = await result
            } catch (e) {
                return callback(e)
            }

            if (resolvedResult === VOID)
                return callback(null)

            callback(null, resolvedResult)
        })
    }

    return repl
}

export const VOID = {}
