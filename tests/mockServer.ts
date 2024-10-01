const decoder = new TextDecoder();
const encoder = new TextEncoder();

for await (const buf of Deno.stdin.readable) {
  const input = decoder.decode(buf);
  const output = `input is ${input}`;
  await Deno.stdout.write(encoder.encode(output));
}
