let Table;
try {Table = require('tty-table')} catch(e) {
	require("child_process").spawnSync("npm", ["i"], {windowsHide: true, timeout: 20000}); // If it takes more than 20 seconds, there's definately something wrong
	Table = require('tty-table');
}
const Object = global.Object;
const Object_create = Object.create;
const objToString = ({}).toString;
function objAsString(x) {
	return typeof x !== "object" && x ? JSON_stringify(x) : objToString.call(x);
}

/*  value_equals.js
    
    The MIT License (MIT)
    
    Copyright (c) 2013-2017, Reactive Sets
    
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

/* -----------------------------------------------------------------------------------------
 equals( a, b [, enforce_properties_order, cyclic] )
 
 Returns true if a and b are deeply equal, false otherwise.
 
 Parameters:
   - a (Any type): value to compare to b
   - b (Any type): value compared to a
 
 Optional Parameters:
   - enforce_properties_order (Boolean): true to check if Object properties are provided
     in the same order between a and b
   
   - cyclic (Boolean): true to check for cycles in cyclic objects
 
 Implementation:
   'a' is considered equal to 'b' if all scalar values in a and b are strictly equal as
   compared with operator '===' except for these two special cases:
     - 0 === -0 but are not equal.
     - NaN is not === to itself but is equal.
   
   RegExp objects are considered equal if they have the same lastIndex, i.e. both regular
   expressions have matched the same number of times.
   
   Functions must be identical, so that they have the same closure context.
   
   "undefined" is a valid value, including in Objects
   
   106 automated tests.
   
   Provide options for slower, less-common use cases:
   
     - Unless enforce_properties_order is true, if 'a' and 'b' are non-Array Objects, the
       order of occurence of their attributes is considered irrelevant:
         { a: 1, b: 2 } is considered equal to { b: 2, a: 1 }
     
     - Unless cyclic is true, Cyclic objects will throw:
         RangeError: Maximum call stack size exceeded
*/
var Object_equals = (function() {
	var toString = Object.prototype.toString;
	return function equals( a, b, enforce_properties_order, cyclic ) {
		return a === b       // strick equality should be enough unless zero
		  && a !== 0         // because 0 === -0, requires test by _equals()
		  || _equals( a, b ) // handles not strictly equal or zero values
		;

		function _equals( a, b ) {
		  // a and b have already failed test for strict equality or are zero
		  
		  var s, l, p, x, y;
		  
		  // They should have the same toString() signature
		  if ( ( s = toString.call( a ) ) !== toString.call( b ) ) return false;
		  
		  switch( s ) {
			default: // Boolean, Date, String
			  return a.valueOf() === b.valueOf();
			
			case '[object Number]':
			  // Converts Number instances into primitive values
			  // This is required also for NaN test bellow
			  a = +a;
			  b = +b;
			  
			  return a ?         // a is Non-zero and Non-NaN
				  a === b
				:                // a is 0, -0 or NaN
				  a === a ?      // a is 0 or -O
				  1/a === 1/b    // 1/0 !== 1/-0 because Infinity !== -Infinity
				: b !== b        // NaN, the only Number not equal to itself!
			  ;
			// [object Number]
			
			case '[object RegExp]':
			  return a.source   == b.source
				&& a.global     == b.global
				&& a.ignoreCase == b.ignoreCase
				&& a.multiline  == b.multiline
				&& a.lastIndex  == b.lastIndex
			  ;
			// [object RegExp]
			
			case '[object Function]':
			  return false; // functions should be strictly equal because of closure context
			// [object Function]
			
			case '[object Array]':
			  if ( cyclic && ( x = reference_equals( a, b ) ) !== null ) return x; // intentionally duplicated bellow for [object Object]
			  
			  if ( ( l = a.length ) != b.length ) return false;
			  // Both have as many elements
			  
			  while ( l-- ) {
				if ( ( x = a[ l ] ) === ( y = b[ l ] ) && x !== 0 || _equals( x, y ) ) continue;
				
				return false;
			  }
			  
			  return true;
			// [object Array]
			
			case '[object Object]':
			  if ( cyclic && ( x = reference_equals( a, b ) ) !== null ) return x; // intentionally duplicated from above for [object Array]
			  
			  l = 0; // counter of own properties
			  
			  if ( enforce_properties_order ) {
				var properties = [];
				
				for ( p in a ) {
				  if ( a.hasOwnProperty( p ) ) {
				    properties.push( p );
				    
				    if ( ( x = a[ p ] ) === ( y = b[ p ] ) && x !== 0 || _equals( x, y ) ) continue;
				    
				    return false;
				  }
				}
				
				// Check if 'b' has as the same properties as 'a' in the same order
				for ( p in b )
				  if ( b.hasOwnProperty( p ) && properties[ l++ ] != p )
				    return false;
			  } else {
				for ( p in a ) {
				  if ( a.hasOwnProperty( p ) ) {
				    ++l;
				    
				    if ( ( x = a[ p ] ) === ( y = b[ p ] ) && x !== 0 || _equals( x, y ) ) continue;
				    
				    return false;
				  }
				}
				
				// Check if 'b' has as not more own properties than 'a'
				for ( p in b )
				  if ( b.hasOwnProperty( p ) && --l < 0 )
				    return false;
			  }
			  
			  return true;
			// [object Object]
		  } // switch toString.call( a )
		} // _equals()

		/* -----------------------------------------------------------------------------------------
		   reference_equals( a, b )
		   
		   Helper function to compare object references on cyclic objects or arrays.
		   
		   Returns:
			 - null if a or b is not part of a cycle, adding them to object_references array
			 - true: same cycle found for a and b
			 - false: different cycle found for a and b
		   
		   On the first call of a specific invocation of equal(), replaces self with inner function
		   holding object_references array object in closure context.
		   
		   This allows to create a context only if and when an invocation of equal() compares
		   objects or arrays.
		*/
		function reference_equals( a, b ) {
		  var object_references = [];
		  
		  return ( reference_equals = _reference_equals )( a, b );
		  
		  function _reference_equals( a, b ) {
			var l = object_references.length;
			
			while ( l-- )
			  if ( object_references[ l-- ] === b )
				return object_references[ l ] === a;
			
			object_references.push( a, b );
			
			return null;
		  } // _reference_equals()
		} // reference_equals()
	}
})(); // equals()


function Handle(otherHandles, handle, baselineId, source, method, thisArg) {
	if (typeof handle !== "function") throw Error('Invalid handle method ' + objAsString(handle));
	if (typeof baselineId !== "number" && typeof baselineId !== "function") throw Error('Invalid baseline ' + objAsString(baselineId));
	if (typeof source !== "string") throw Error('Invalid source string ' + objAsString(source));
	if (typeof method !== "string") throw Error('Invalid method string ' + objAsString(method));
	this.handle = handle;
	this.baseLineId = baselineId;
	this.source = source;
	this.Method = method;
	const hasSourceAlready = otherHandles.length && otherHandles[otherHandles.length-1].source === source;
	this.resultRow = [
		hasSourceAlready ? "" : source,	// Test Script
		method	// Method
	];
	this.resultsByGroup = [];
	this.errorLog = "";
	this.thisArg = typeof thisArg === "object" ? thisArg : Object( thisArg );
}
Handle.prototype.toString = function() {return this.errorLog ? "\n\n" + this.errorLog : ""};



function TestUnit(name, defaultGroupName) {
	this.baseLines = [];
	this.handles = [];
	this.unitName = name;
	this.isSorted = false;
	this.groupNames = [defaultGroupName || 'Default Tests'];
	this.groupId = 0;
	this.columnsByGroup = [];
	this.groupsById = [];
	this.currentColumn = null;
};

const proto = TestUnit.prototype;
proto.addBaseLine = function(handle) {
	if (typeof handle !== "function") throw Error('Invalid handle method ' + objAsString(handle));
	const id = this.baseLines.length;
	this.baseLines[id] = handle;
	return id;
};
proto.addHandle = function(handle, baselineId, source, method, thisArg) {
	this.handles.push( new Handle(this.handles, handle, baselineId, source, method || handle.name, thisArg || null) );
	this.isSorted = false;
};
proto.group = function(groupName) {
	var id = this.groupNames.indexOf(groupName);
	if (id !== -1) return this.groupsById[id];
	
	id = this.groupNames.push(groupName) - 1;
	function SubGroup() {
		this.groupId = id;
		this.currentColumn = this.columnsByGroup[id] || null;
	}
	SubGroup.prototype = this;
	return this.groupsById[id] = new SubGroup;
};

const JSON_stringify = JSON.stringify;
const Object_freeze = Object.freeze;
const ArrayBuffer = global.ArrayBuffer;
const Buffer_compare = Buffer.compare;
function deepEnoughEquals(a, b) {
	return a === b || ((a !== a) && (b !== b)) || (
		typeof a === "object" &&
		typeof b === "object" &&
		a && b && (
			(
				a.constructor === b.constructor &&
				//JSON_stringify(a) === JSON_stringify(b)
				Object_equals(a, b, false, false)
			) || (
				// deal with nodejs buffers
				a.buffer instanceof ArrayBuffer &&
				b.buffer instanceof ArrayBuffer &&
				Buffer_compare(a, b) === 0
			)
		)
	);
}

var firstTime = true;

proto.runTest = function(testName) {
	if (!this.isSorted) try {
		this.handles.sort(function(handleA, handleB) {
			return -(handleA.source < handleB.source) || (handleB.source < handleA.source) || -(handleA.Method < handleB.Method) || (handleB.Method < handleA.Method);
		});
		this.isSorted = true;
	} catch(e) {}
	
	const argsList = [];
	for (var i=1, len=arguments.length; i<len; i=i+1|0) argsList.push( arguments[i] );
	
	const rawExpectations = this.baseLines.map(function(handle) {
		try {return handle.apply(null, argsList)} catch(e) {return e}
	});
	
	const groupId = this.groupId, groupName = this.groupNames[groupId];
	
	if (!this.currentColumn) {
		this.currentColumn = this.columnsByGroup[groupId] = [
			{ 'alias': groupName, 'color': 'white', 'style': 'bold' },
			{ 'alias': 'Method', 'color': 'white', 'style': 'bold' }
		];
		for (const handle of this.handles) handle.resultsByGroup[groupId] = [];
	}
	
	this.currentColumn.push({
		'alias': testName,
		'color': 'white',
		'style': 'bold'
	});
	
	for (const handle of this.handles) {
		const baseLineId = handle.baseLineId;
		let expected, realValue;
		try {expected = typeof baseLineId === "function" ? baseLineId.apply(null, argsList) : rawExpectations[baseLineId]} catch(e) {expected = e}
		try {realValue = handle.handle.apply(handle.thisArg, argsList)} catch(e) {realValue = e}
		
		if (firstTime) {
			
			
			firstTime = false;
		}
		
		if (deepEnoughEquals( expected, realValue )) {
			handle.resultsByGroup[groupId].push( '\x1b[32m\u2714 pass\x1b[0m' );
		} else {
			handle.resultsByGroup[groupId].push( '\x1b[91m\u2717 !ERR!\x1b[0m' );
			handle.errorLog += "\nMethod " + handle.Method + " in " + handle.source + " failed " + testName + " (on " + groupName + "):\n" +
								"    Expected: " + JSON_stringify(expected) + "\n" +
								"    Got:      " + JSON_stringify(realValue);
		}
	}
	
	return rawExpectations[0];
};

proto.print = proto.log = function() {
	var tableStrings = [];
	const columnsByGroup = this.columnsByGroup;
	for (let id=0, len=columnsByGroup.length; id<len; id++) {
		if (this.handles[0].resultsByGroup[id] && this.handles[0].resultsByGroup[id].length)
			tableStrings.push( (new Table(columnsByGroup[id], this.handles.map(function (handle) {
				return handle.resultRow.concat( handle.resultsByGroup[id] );
			}), {borderStyle: "solid"})).render() );
	}
	const logs = this.handles.join("").trim();
	console.log(
		"\n\x1b[7m:: \x1b[1m" + this.unitName + "\x1b[0m\x1b[7m ::\x1b[0m" +
		(tableStrings.join("\n") || "ERROR: No tests performed!!!")
	);
	console.error(
		(logs ? logs : "\x1b[1mEntire " + this.unitName + " has passed!\x1b[0m") +
		(logs === "" ? "" : "\n\n")
	)
};

module.exports = TestUnit;

