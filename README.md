# REPL-X

Promise friendly REPL

## Installation

```sh
npm i repl-x
```

## Usage

To start an REPL server, it's exactly the same as `repl` module in node.js.

```typescript
import * as REPLX from 'repl-x'

const server = REPLX.start(/* options */)
```

Now you can happily play with promise

```shell
> (async () => 'hello world')()
Promise { 'hello world' }
>
> @ (async () => 'hello world')()
'hello world'
> 
```

Here the leading `@` symbol will tell the server to await the result of following expression.
