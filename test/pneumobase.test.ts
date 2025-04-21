import { LocalFile } from 'generic-filehandle2'
import { expect, test } from 'vitest'

import Trix from '../src/index'

test('can find pneumobase features', async () => {
  const trix1 = new Trix(
    new LocalFile(
      './test/testData/D39V_annotation_coding_features_sorted.gff.ixx',
    ),
    new LocalFile(
      './test/testData/D39V_annotation_coding_features_sorted.gff.ix',
    ),
  )
  const hitList = await trix1.search('SPV_05')
  expect(hitList).toMatchSnapshot()
})
