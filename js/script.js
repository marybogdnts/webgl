const fragmentParams = `
#ifdef USE_SHADOWMAP
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
	#endif

	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}

	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );

		vec2 planar = v.xy;

		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;

		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}

	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear ); // need to clamp?
		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		
		return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
	}

#endif
`;

const vertexParams = `
#ifdef USE_SHADOWMAP
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif
`;

const vertex = `
#ifdef USE_SHADOWMAP
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#pragma unroll_loop
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * worldPosition;
	}
	#endif
#endif
`;

window.onload =function () {
	var width = window.innerWidth;
	var height  = window.innerHeight;
	var canvas = document.getElementById('canvas');

	canvas.setAttribute('width', width);
	canvas.setAttribute('height', height);

	var ball = {
		rotationX: 0,
		rotationY: 0,
		rotationZ: 0,

		positionX: 0,
		positionY: 0,
		positionZ: 0

	};

	var gui = new dat.GUI();
	gui.add(ball, 'rotationX').min(-0.1).max(0.1).step(0.001);
	gui.add(ball, 'rotationY').min(-0.1).max(0.1).step(0.001);
	gui.add(ball, 'rotationZ').min(-0.1).max(0.1).step(0.001);

	gui.add(ball, 'positionX').min(-5).max(5).step(0.1);
	gui.add(ball, 'positionY').min(-5).max(5).step(0.1);
	gui.add(ball, 'positionZ').min(-5).max(5).step(0.1);

	var renderer = new THREE.WebGLRenderer({canvas: canvas});
	renderer.setClearColor(0x000000);//(0x9ACEEB);
	renderer.shadowMap.enabled = true;
	
	var scene = new THREE.Scene();
	var camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
	camera.position.set(0, 100, 1000);


	/*const color = 0xFFFFFF;
	const intensity = 0.5;
	const light = new THREE.DirectionalLight(color, intensity);
	light.position.set(250, 250, 0);
	light.castShadow = true;
	scene.add(light);*/

	const color2 = 0xFFFFFF;
	const intensity2 = 0.8;
	const light2 = new THREE.PointLight(color2, intensity2);
	light2.position.set(-150, 100, -20);
	light2.castShadow = true;
	//scene.add(light2);

	const color3 = 0xFFFFFF;
	const intensity3 = 0.8;
	const light3 = new THREE.PointLight(color2, intensity2);
	light3.position.set(150, 100, -20);
	light3.castShadow = true;
	scene.add(light3, light2);

	//var planeBottomMesh = new THREE.CircleBufferGeometry(20,20);//PlaneGeometry( 100, 30, 32 );
	var geometry = new THREE.CircleBufferGeometry(2000,50);//PlaneGeometry( 800, 800, 800 );
	var material = new THREE.MeshPhongMaterial({color: 0x79acba}); ;//new THREE.MeshPhongMaterial( {  color: 0xDB18FF, shininess: 30, wireframe: true} ); //({color: 0xDB18FF, shininess: 30});
	var mesh = new THREE.Mesh(geometry, material);
	material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <shadowmap_pars_fragment>',
            fragmentParams
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <shadowmap_pars_vertex>',
            vertexParams
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <shadowmap_vertex>',
            vertex
        )
    };

	mesh.receiveShadow = true;	
	mesh.position.z = -50;
	mesh.position.y = -150;
    mesh.rotation.set(-1.6, 0.0, 0.0);//-1,4
    scene.add(mesh);

/*
	const boxgeometry = new THREE.BoxBufferGeometry(2000, 1000, 2000);
	const loaderb = new THREE.TextureLoader();
	const materialb = loaderb.load('../sky.jpg');
	materialb.wrapS = THREE.RepeatWrapping;
	materialb.wrapT = THREE.RepeatWrapping;
	materialb.magFilter = THREE.NearestFilter;
	const Horb = 4;
	const Verb = 2;
	materialb.repeat.set(Horb, Verb);
	
	const boxMaterial = new THREE.MeshPhongMaterial({
	color: 0x79acba,
	shininess: 10,
	//specular: 0x79acba,
	//map: materialb,
	side: THREE.BackSide
	});
	const box = new THREE.Mesh(boxgeometry, boxMaterial);

	scene.add(box);*/
	
  
	
	var cylinderMesh = new THREE.CylinderGeometry( 0, 90, 200, 100 );//(200, 200, 200, 12, 12, 12);
	var material = new THREE.MeshPhongMaterial({color: 0xba9279}); //new THREE.MeshPhongMaterial( {  color: 0xDB18FF, shininess: 30, wireframe: true} ); //({color: 0xDB18FF, shininess: 30});
	var cylinder = new THREE.Mesh(cylinderMesh, material);
	cylinder.castShadow = true;
	cylinder.receiveShadow = true;
	cylinder.position.z =-50;
	cylinder.position.y =-110;
	cylinder.position.x = 180;
    cylinder.rotation.set(2.2, 0.0, 0.8);//0,2
 	scene.add(cylinder);

	var cylinder2Mesh = new THREE.CylinderGeometry( 80, 80, 200, 100 );//(200, 200, 200, 12, 12, 12);
	var material = new THREE.MeshPhongMaterial({color: 0x9e6a81}); ;//new THREE.MeshPhongMaterial( {  color: 0xDB18FF, shininess: 30, wireframe: true} ); //({color: 0xDB18FF, shininess: 30});
	var cylinder2 = new THREE.Mesh(cylinder2Mesh, material);
	cylinder2.castShadow = true;
	cylinder2.receiveShadow = true;
	cylinder2.position.z =-100;
	cylinder2.position.y =-50;
	cylinder2.position.x = -170;
    cylinder2.rotation.set(0.0, 0.0, 0.0);//0,2
 	scene.add(cylinder2);


 	var cylinder3Mesh = new THREE.CylinderGeometry( 1, 140, 200, 3 );//(200, 200, 200, 12, 12, 12);
	var material = new THREE.MeshPhongMaterial({color: 0xc2bf8c}); ;//new THREE.MeshPhongMaterial( {  color: 0xDB18FF, shininess: 30, wireframe: true} ); //({color: 0xDB18FF, shininess: 30});
	var cylinder3 = new THREE.Mesh(cylinder3Mesh, material);
	cylinder3.castShadow = true;
	cylinder3.receiveShadow = true;
	cylinder3.position.z =-200;
	cylinder3.position.y =-50;
	cylinder3.position.x = 90;
    cylinder3.rotation.set(0.0, 0.2, 0.0);//0,2
 	scene.add(cylinder3);


 	var cubeMesh = new THREE.BoxGeometry( 136,136,136 );//(200, 200, 200, 12, 12, 12);
	var material = new THREE.MeshPhongMaterial({color: 0x7699cc}); ;//new THREE.MeshPhongMaterial( {  color: 0xDB18FF, shininess: 30, wireframe: true} ); //({color: 0xDB18FF, shininess: 30});
	var cube= new THREE.Mesh(cubeMesh, material);
	cube.castShadow = true;
	cube.receiveShadow = true;
	cube.position.z =-10;
	cube.position.y = -82;
	cube.position.x = -25;
    cube.rotation.set(0.0, 0.99, 0.0);//0,2
 	scene.add(cube);

 	var shereMesh = new THREE.SphereGeometry( 75,32,32 );//(200, 200, 200, 12, 12, 12);
	var material = new THREE.MeshPhongMaterial({color: 0x947db5}); ;//new THREE.MeshPhongMaterial( {  color: 0xDB18FF, shininess: 30, wireframe: true} ); //({color: 0xDB18FF, shininess: 30});
	var shere= new THREE.Mesh( shereMesh, material);
	shere.castShadow = true;
	shere.receiveShadow = true;
	shere.position.z =-50;
	shere.position.y = 68;
	shere.position.x = -25;
    shere.rotation.set(0.0, 0.0, 0.0);//0,2
 	scene.add(shere);

  
 function loop(){
  	scene.rotation.x +=  ball.rotationX;
  	scene.rotation.y +=  ball.rotationY;
  	scene.rotation.z +=  ball.rotationZ;

  	scene.position.x +=  ball.positionX;
  	scene.position.y +=  ball.positionY;
  	scene.position.z +=  ball.positionZ;

  	renderer.render(scene, camera);
  	requestAnimationFrame(function() {loop();});

  }
	loop();

	renderer.render(scene, camera);
	renderer.shadowMap.enabled = true;
}