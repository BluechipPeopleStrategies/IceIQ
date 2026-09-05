import {getReadSceneCamera} from '../one-on-one/readSequenceVisuals.js';

// Match the scenario presentation while preserving the whole cognitive task.
// Input is raycast onto ice; a tilted camera does not change the scoring frame.
export function gymRinkCamera(aspect){
 return getReadSceneCamera({minX:-31.7,maxX:31.7,minY:-14.1,maxY:14.1},aspect,'broadcast');
}
