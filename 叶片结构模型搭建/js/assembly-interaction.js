export function serializeAssemblyItem(item) {
  return {
    type: item.type,
    parameters: {...item.parameters},
    transform: {
      position: item.root.position.toArray(),
      quaternion: item.root.quaternion.toArray(),
      scale: item.root.scale.toArray(),
    },
  };
}

export function offsetCopyRecord(record, offset = [0.45, 0.25, 0.35]) {
  return {
    type: record.type,
    parameters: {...record.parameters},
    transform: {
      position: record.transform.position.map((value, index) => value + offset[index]),
      quaternion: [...record.transform.quaternion],
      scale: [...record.transform.scale],
    },
  };
}
