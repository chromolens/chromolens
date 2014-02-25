#!/usr/bin/python
from collections import defaultdict
from bisect import bisect_left as bisect

import simplejson

first = True

clusters_by_chro = defaultdict(lambda: defaultdict(list))
bindings_by_chro = defaultdict(list)
with open('Chip-3D-vers2.txt') as f:
    for l in f:
        if first:
            first = False
            continue
        (chro, start, end, cluster, direct, peak) = l.split()
        (chro, start, end, cluster, direct, peak) = (
            chro[3:], int(start), int(end), int(cluster),
            direct == 'TRUE', float(peak))
        pos = start + 155
        bindings_by_chro[chro].append((pos, direct, peak))
        clusters_by_chro[chro][cluster].append(pos)

for chro, bindings in bindings_by_chro.items():
    bindings.sort()
    geneMax = bindings[-1][0]
    clusters = list(clusters_by_chro[chro].values())
    pos = [x[0] for x in bindings]
    arcs = []
    for cluster in clusters:
        if len(cluster) > 1:
            cluster.sort()
            b = [bisect(pos, x) for x in cluster]
            assert len(b) == len(set(b))
            arcs.append(b)
    arcs.sort()
    with open(chro + ".js", 'w') as f:
        simplejson.dump([geneMax, bindings, arcs], f)
