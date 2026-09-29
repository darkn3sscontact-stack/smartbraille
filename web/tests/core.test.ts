import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import fixtures from '../../data/fixtures.json';
import {ALPHABET,convert,unicode,dots,normalize,evaluate,dictatedDots,metrics,csvCell,toCSV,type Attempt} from '../src/core';
describe('independent Georgian reference fixtures',()=>{
 it('covers exactly 33 modern letters',()=>expect(ALPHABET).toHaveLength(33));
 for(const [char,mask,braille] of fixtures.letters) it(String(char),()=>{expect(convert(String(char))).toEqual([{char,mask}]);expect(unicode(Number(mask))).toBe(braille);});
 for(const fixture of fixtures.words)it(fixture.text,()=>{expect(convert(fixture.text).map(c=>c.mask)).toEqual(fixture.masks);expect(convert(fixture.text).map(c=>unicode(c.mask!)).join('')).toBe(fixture.unicode);});
 it('normalizes Mtavruli and whitespace',()=>expect(normalize('  ᲓᲔᲓᲐ\n  და  მამა ')).toBe('დედა და მამა'));
 it('flags unsupported characters without dropping them',()=>expect(convert('ა1!')).toEqual([{char:'ა',mask:1},{char:'1',mask:null},{char:'!',mask:null}]));
 it('empty is empty, not an invented pattern',()=>expect(convert(' \n ')).toEqual([]));
 it('canonical numbering never mirrors',()=>{expect(dots(9)).toEqual([1,4]);expect(dots(36)).toEqual([3,6]);expect(unicode(63)).toBe('⠿');});
});
describe('answer and record integrity',()=>{
 it('uses a global normalization rule and never fuzzy-matches',()=>{expect(evaluate('ა','ასო Ა.')).toBe(true);expect(evaluate('დედა','მამა')).toBe(false);expect(evaluate('დედა','დეა')).toBe(false);expect(evaluate('ა','')).toBe(false);});
 it('dictated dots are explicit and bounded',()=>{expect(dictatedDots('ერთი, სამი და ექვსი')).toBe(37);expect(dictatedDots('1 1 4')).toBe(9);expect(dictatedDots('7')).toBeNull();expect(dictatedDots('შემდეგი')).toBeNull();});
 it('empty and unresolved results have no accuracy',()=>{expect(metrics([]).accuracy).toBeNull();expect(metrics([{outcome:'recognition-unresolved'} as Attempt]).answered).toBe(0);});
 it('preserves first completed answer and excludes assistance in first-pass metrics',()=>{const rows=[{sessionId:'s',questionId:'q',outcome:'incorrect',assisted:false,retry:0},{sessionId:'s',questionId:'q',outcome:'correct',assisted:true,retry:1},{sessionId:'s',questionId:'b',outcome:'skipped',retry:0},{sessionId:'s',questionId:'c',outcome:'correct',assisted:false,retry:0}] as Attempt[];expect(metrics(rows)).toEqual({correct:2,answered:3,accuracy:2/3,firstCorrect:1,firstTotal:2,other:1});});
 it('escapes spreadsheet formulas and quotes',()=>{expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"');expect(csvCell(' a"b')).toBe('" a""b"');expect(csvCell('\t@bad').startsWith('"\'')).toBe(true);expect(toCSV([])).toContain('mappingRevision');});
});
describe('source asset preservation',()=>{
 const root=resolve('..');const manifest=JSON.parse(readFileSync(resolve(root,'data/asset-manifest.json'),'utf8'));
 for(const asset of manifest)it(asset.original,()=>expect(createHash('sha256').update(readFileSync(resolve(root,asset.path))).digest('hex')).toBe(asset.sha256));
});
