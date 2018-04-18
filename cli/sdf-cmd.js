#!/usr/bin/env node
const path = require('path');
const { spawn } = require('child_process');

const { prompt } = require('../lib/helpers');

const sdfcliPath = path.resolve(__dirname, '..', '.dependencies', 'sdfcli');

/**
 * Handle the route cli command
 *
 * @param {string} cmd
 * @param {string|object} params
 * @param {string|object} options
 */
async function handler(cmd, params, options) {
  if (cmd === 'create') return;

  const isStringParam = typeof params === 'string';
  const { password = await prompt('Enter password: ') } = isStringParam ? options : params;

  const args = isStringParam
    ? params
      .split(',')
      .map(option => {
        const [ key, value = '' ] = option.split('=');
        return `-${ key } ${ value }`;
      })
      .join(' ')
    : '';

  const sdfcli = spawn(sdfcliPath, [ cmd, args ]);

  console.log(`\nExecuted Command:\n${ sdfcliPath } ${ cmd } ${ args }\n`);

  // send password to hidden prompt by sdfcli
  sdfcli.stdin.write(`${ password }\n`);

  sdfcli.stdout.on('data', async data => {
    const msg = data.toString();
    // cleanup of duplicate "Enter password:" prompt
    console.log(msg.replace('Enter password:', ''));
    const lowerCaseMsg = msg.toLowerCase();
    if (lowerCaseMsg.includes('?') || lowerCaseMsg.includes('Enter')) {
      const answer = await prompt('> ');
      sdfcli.stdin.write(`${ answer }\n`);
    }
  });

  sdfcli.stderr.on('data', data => {
    console.error(`>>> Error ${ data }`);
  });

  sdfcli.on('close', code => {
    if (code !== 0) {
      console.error(`>>> SDFCLI exited with code ${ code }`);
    }
    sdfcli.stdin.end();
  });
}

module.exports = handler;
