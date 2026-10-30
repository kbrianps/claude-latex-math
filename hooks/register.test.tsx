import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEElEQVR4nGP4z8AARwzIHABvqgf5gNwAKAAAAABJRU5ErkJggg=='

const message = (text: string, surface: 'terminal' | 'desktop' = 'terminal') =>
  ({
    plugin: 'latex-math',
    component: 'AssistantMessage',
    requestId: 'msg_1',
    surface,
    props: { text, isFirstOfReply: true },
  }) as const

const engine = (on: On) =>
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

const latex = (on: On, exitCode = 0) => {
  const calls: string[] = []
  on('process.run', (_$, e) => {
    calls.push(e.init?.stdin ?? '')
    return {
      value: {
        exitCode,
        stdout: exitCode === 0 ? TINY_PNG : '',
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })
  return calls
}

test('draws a display formula as an image under the leading text', async ($, on) => {
  engine(on)
  const calls = latex(on)
  const ui = await $.ui.mount(message('The area:\n\n$$\\int_0^1 x\\,dx$$\n\nDone.'))

  expect(await ui.find({ type: 'Image' })).toBeTruthy()
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  expect(calls[0]).toContain('\\int_0^1 x\\,dx')
  await ui.unmount()
})

test('sends the text around a formula down the chain, without the formula', async ($, on) => {
  const seen: string[] = []
  on('ui.render', ($, e) => {
    if (e.component === 'AssistantMessage') seen.push(e.props.text)
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  latex(on)
  const ui = await $.ui.mount(message('Before.\n\n$$x^2$$\n\n```mermaid\ngraph LR\n  A --> B\n```\n\nAfter.'))

  expect(await ui.find({ type: 'Image' })).toBeTruthy()
  expect(seen).toEqual(['Before.', '```mermaid\ngraph LR\n  A --> B\n```\n\nAfter.'])
  await ui.unmount()
})

test('draws the bracket form too', async ($, on) => {
  engine(on)
  latex(on)
  const ui = await $.ui.mount(message('\\[ a^2 + b^2 = c^2 \\]'))

  expect(await ui.find({ type: 'Image' })).toBeTruthy()
  await ui.unmount()
})

test('leaves text without display math, inline math and code to the engine', async ($, on) => {
  engine(on)
  const calls = latex(on)
  const cases = ['Plain reply.', 'Inline $E = mc^2$ stays text.', '```\n$$ not math $$\n```', 'Wrap it as `$$...$$` please.']

  for (const text of cases) {
    const ui = await $.ui.mount(message(text))
    expect(await ui.find({ type: 'Image' })).toBeFalsy()
    expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
    await ui.unmount()
  }
  expect(calls.length).toBe(0)
})

test('falls back to the text when LaTeX fails', async ($, on) => {
  engine(on)
  latex(on, 1)
  const ui = await $.ui.mount(message('$$\\frac{1}{$$'))

  expect(await ui.find({ type: 'Image' })).toBeFalsy()
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})

test('leaves every other surface to the engine', async ($, on) => {
  engine(on)
  const calls = latex(on)
  const ui = await $.ui.mount(message('$$x^2$$', 'desktop'))

  expect(await ui.find({ type: 'Image' })).toBeFalsy()
  expect(calls.length).toBe(0)
  await ui.unmount()
})

const facts = (surfaces: readonly ('terminal' | 'desktop')[], traits: readonly 'print'[] = []) => ({
  model: 'claude-opus-5-5',
  promptModel: 'claude-opus-5-5',
  surfaces,
  tools: [],
  outputStyle: null,
  traits,
})

const compose = (on: On) =>
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'engine', scope: 'shared' as const }] }))

test('tells the model about display math in the terminal', async ($, on) => {
  compose(on)
  latex(on)
  const { sections } = await $.prompt.compose(facts(['terminal']))

  expect(sections.map(section => section.id)).toEqual(['intro', 'latex-math:math'])
  expect(sections[1]?.text).toContain('$$')
})

test('says nothing about math without a terminal or without LaTeX', async ($, on) => {
  compose(on)
  latex(on)
  const desktop = await $.prompt.compose(facts(['desktop']))
  const print = await $.prompt.compose(facts(['terminal'], ['print']))
  expect(desktop.sections.map(section => section.id)).toEqual(['intro'])
  expect(print.sections.map(section => section.id)).toEqual(['intro'])
})

test('says nothing about math when latex or dvipng is missing', async ($, on) => {
  compose(on)
  latex(on, 1)
  const { sections } = await $.prompt.compose(facts(['terminal']))

  expect(sections.map(section => section.id)).toEqual(['intro'])
})

test('draws formulas in the color option, and indents what follows to the reply text', { options: { color: '#adbac7' } }, async ($, on) => {
  engine(on)
  const scripts: string[] = []
  on('process.run', (_$, e) => {
    scripts.push(e.argv.join(' '))
    return {
      value: { exitCode: 0, stdout: TINY_PNG, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
    }
  })
  const ui = await $.ui.mount(message('Lead.\n\n$$x^2$$\n\nAfter.'))

  expect(scripts[0]).toContain("-fg 'RGB 173 186 199'")
  const boxes = (await ui.findAll({ type: 'Box' })).map(box => box.props.marginLeft ?? 0)
  expect(boxes).toEqual(expect.arrayContaining([0, 2, 2]))
  await ui.unmount()
})
