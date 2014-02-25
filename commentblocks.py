#!/usr/bin/env python

from sys import argv
from os.path import exists
from os import unlink
import re

shortblock_re = re.compile(r'/\*\*.*\*/')
blockstart_re = re.compile(r'/\*\*')
blockend_re = re.compile(r'\*/')
blockcont_re = re.compile(r'^\s*\*')

in_abclass = False
namespace = None
target = 'all_interfaces.js'


def commentBlock(name):
    '''generate a xxx.itf.js from a xxx.ts file.
    This will contain all the comment blocks belonging to @abstract @classes,
    which are dropped by tsc -c
    Also see https://github.com/jsdoc3/jsdoc/issues/272
    '''
    with open(name) as f, open(target, 'a') as f2:

        def treat_block(block):
            global in_abclass, namespace
            if '@namespace' in block:
                namespace = block
                in_abclass = False
            elif '@class' in block:
                if '@abstract' in block:
                    in_abclass = True
                    if namespace:
                        f2.write(namespace)
                        f2.write('\n')
                        namespace = None
                    f2.write(block)
                    f2.write('\n')
                else:
                    in_abclass = False
            else:
                if in_abclass:
                    f2.write(block)
                    f2.write('\n')

        in_block = False
        block = None
        match = None
        for n, l in enumerate(f):
            if shortblock_re.search(l):
                assert not in_block, (n, l)
                match = shortblock_re.search(l)
                treat_block(l[match.start():m.end()])
            elif blockstart_re.search(l):
                assert not in_block, (n, l)
                match = blockstart_re.search(l)
                block = [l[match.start():]]
                in_block = True
            elif blockend_re.search(l):
                if in_block:
                    match = blockend_re.search(l)
                    block.append(l[:match.end()])
                    treat_block(''.join(block))
                    in_block = False
            elif blockcont_re.match(l):
                if in_block:
                    block.append(l)
            else:
                assert not in_block, (n, l)

if __name__ == '__main__':
    if exists(target):
        unlink(target)
    for f in argv:
        if f.endswith('.ts'):
            commentBlock(f)
