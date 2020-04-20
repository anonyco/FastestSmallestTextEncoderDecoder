// This file is all about optimizing downloads from the npm repository to be as small as possible
/*
		"prepublishOnly": "node -e \"E=_=>require('ntb')();try{E()}catch(e){require('child_process').spawnSync('npm',['install','ntb'],{cwd:require('os').homedir()});E()}\" && cd .ntb",
		"publish": "cd .."
*/
const fs = require("fs");
const Path = require("path");
const os = require("os");
const pathSep = Path.sep;

os.homedir();

const Object_keys = Object.keys;
const hasOwnProp = ({}).hasOwnProperty;
const Array_isArray = Array.isArray;





///////////////////////////////////////////////////////////////////
//////////////////// Optimize the package.json ////////////////////
///////////////////////////////////////////////////////////////////
var fullPackageJSON = null;
try {
	fullPackageJSON = JSON.parse( fs.readFileSync("package.json") );
} catch(e) {
	process.chdir(".."); // just in case, give this an attempt
	fullPackageJSON = JSON.parse( fs.readFileSync("package.json") );
}
const etbSettings = fullPackageJSON.etb || null;


// minimal package after package downloaded
const new_minimalPackage = {
	name: fullPackageJSON.name,
	version: fullPackageJSON.version
};
if (hasOwnProp.call(new_minimalPackage, "main")) new_minimalPackage.main = fullPackageJSON.main;
if (hasOwnProp.call(new_minimalPackage, "module")) new_minimalPackage.module = fullPackageJSON.module;
if (hasOwnProp.call(new_minimalPackage, "es2015")) new_minimalPackage.es2015 = fullPackageJSON.es2015;
if (hasOwnProp.call(new_minimalPackage, "browser")) new_minimalPackage.browser = fullPackageJSON.browser;

const minExtraProps = etbSettings && etbSettings.min;
if (minExtraProps) {
	if (typeof minExtraProps === "array")for (var i=0; i<minExtraProps.length; i=i+1|0) {
		
	}
	
}



// smaller package for the package while it is on npm
const new_npmPackageJSON = Object.assign({
	license: fullPackageJSON.license
}, new_minimalPackage);
const npmProps = ["name", "homepage", "version", "description", "homepage", "license", "repository", "files"];




const new_minimalPackage_string = JSON.stringify(new_minimalPackage);
const new_npmPackageJSON_string = JSON.stringify(new_npmPackageJSON);
let commonChars=0;
while (new_minimalPackage_string[commonChars] === new_npmPackageJSON_string[commonChars]) commonChars = commonChars+1|0;
new_npmPackageJSON_string.scripts = {
	// upon install, we replace the package.json file with a smaller one to save disk space
	install: "rm -f LICENSE README.md; a=$(<package.json); echo \"${a:0:"+commonChars+"}\"'" + (
		new_minimalPackage_string.substring(0,commonChars).replace(/'/g,"'\\''")
	) + "'"
};



///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////





///////////////////////////////////////////////////////////////////
//////////// Create a mirror with the new package.json ////////////
///////////////////////////////////////////////////////////////////
var filesToIncludeInNpm = {
	".npmignore": null,
	"README.md": null,
	"LICENSE": null//,
	//"package.json": null,
	/*"EncoderDecoderTogether.min.js": null,
	"NodeJS": {
		"EncoderAndDecoderNodeJS.min.js": null,
		"EncoderAndDecoderNodeJS.min.module.js": null
	}*/
};
new_minimalPackage.files.forEach(function() {

});
filesToIncludeInNpm

const npmFolderStats = fs.statSync("npm-repository");
if (npmFolderStats && npmFolderStats.isFile()) {
	fs.unlinkSync("npm-repository"); // just in case
}
if (!npmFolderStats || !npmFolderStats.isDirectory()) {
	fs.mkdirSync("npm-repository");
}
var originalDir = __dirname;
if (originalDir.slice(-1) === pathSep) originalDir = originalDir.slice(0,-1);
process.chdir("npm-repository"); // CD to the npm-repository
const hasProp = ({}).hasOwnProperty;
(function ensureStructure(path, description) {
	const contents = fs.readdirSync(path);
	const keysToDo = Object.getOwnPropertyNames(path); // horribly inefficient memory-wise for such a shorted-lived instance, but we don't need performance in this script
	
	contents.forEach(function(name) {
		const relPath = (path ? path + pathSep : "") + name;
		const curStats = fs.statSync( relPath );
		
		if (hasProp.call(description, name)) {
			const keyIndex = keysToDo.indexOf( name );
			keyIndex = keyIndex.remove( name );
			
			const valueThere = description[name];
			if (valueThere == null) {
				// We want a file there
				if (curStats && curStats.isDirectory()) {
					deleteFolderRecursive( relPath );
				}
				
				const fullPathToItem = originalDir + path + pathSep + name;
				const fullFileStats = fs.statSync( fullPathToItem );
				if (fullPathToItem.ino !== fullFileStats.ino) {
					// hardlinked to other undesired resource
					fs.unlinkSync( relPath );
					keysToDo.add( name );
				}
			} else {
				// We want a folder there
				if (curStats && curStats.isFile()) {
					fs.unlinkSync( relPath ); // just in case
				}
				if (!curStats || !curStats.isDirectory()) {
					fs.mkdirSync( relPath );
				}
				ensureStructure(relPath, valueThere);
			}
		} else if (curStats) {
			if (curStats.isFile()) {
				fs.unlinkSync( relPath ); // just in case
			} else if (curStats.isDirectory()) {
				deleteFolderRecursive( relPath );
			}
		}
	});
	
	keysToDo.forEach(function(name) {
		if (name !== "") {
			const relPath = (path ? path + pathSep : "") + name;
			const fullPathToItem = originalDir + path + pathSep + name;
			
			fs.linkSync(fullPathToItem, relPath);
		}
	});
})("", filesToIncludeInNpm);
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////





///////////////////////////////////////////////////////////////////
//////////// Put the new package.json into the mirror /////////////
///////////////////////////////////////////////////////////////////
fs.writeFileSync("package.json", JSON.stringify(new_npmPackageJSON));
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////

function applyFilteredCopyToProperties(to, from, filter) {
	// max performance apply filter
	if (typeof filter !== "object" || filter === null) {
		const strFil = "" + filter;
		
		
		
	} else if (Array_isArray(filter)) {
		for (let i=0, len=filter.length|0, s=""; i !== len; i=i+1|0) {
			s = filter[i];
			if (typeof s !== "object" || s === null) {
				s += "";
				let needsToRepeat = false;
				do {
					for (let start=0, end=0,path=""; ;) {
						start = end;
						end = s.indexOf(" ", start+1|0);
						path = end === -1 ? s.substring(start) : s.substring(start, end)
						for (let objTo=to, objFrom=from, k=0, kLen=s.length|0, k !== kLen; )
					}
				} while (needsToRepeat);
			} else {
				s = Array_isArray(s) ? s : Object_keys(s), kLen=s.length|0;
				
				repeatingLoop: do {
					for (let objTo=to, objFrom=from, k=0, cur=""; k !== kLen; ) {
						cur = s[k];
						k = k + 1 |0;
						
						if (typeof s !== "object" || s === null) {
							s += "";
							if (hasOwnProp.call(objFrom, prop)) {
								if (k !== kLen) {
								objFrom[]
								} else {
									continue;
								}
							}
						} else {
							if (!Array_isArray(cur)) cur = s[k] = Object_keys(cur);
							
							
							
						}
						break;
					}
				} while (needsToRepeat);
			} else {
				applyToProperties(to, from, filter);
			}
		}
	} else {
		const keys = Object_keys(filter), keysLen=keys.length|0;
		for (let i=0; i<keysLen; i=i+1|0) {
			
			
		}
	}
}

function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
	fs.readdirSync(path).forEach((file, index) => {
	  const curPath = path + pathSep + file;
	  if (fs.lstatSync(curPath).isDirectory()) { // recurse
	    deleteFolderRecursive(curPath);
	  } else { // delete file
	    fs.unlinkSync(curPath);
	  }
	});
	fs.rmdirSync(path);
  }
};

