﻿#version 450
#define EPSILON = 0.001
#define BIG = 1000000.0
const int DIFFUSE = 0;
const int REFLECTION = 1;
//const int REFRACTION = 3;
const int DIFFUSE_REFLECTION = 0;
const int MIRROR_REFLECTION = 1;

out vec4 FragColor;//цвет пикселя на экране
in vec3 glPosition;//соответсвует выходной вершине вершинного шейдера

/*   STRUCTURES   */
struct SSphere
{
 vec3 Center;
 float Radius;
 int MaterialIdx;
};
struct STriangle
{
 vec3 v1;
 vec3 v2;
 vec3 v3;
 int MaterialIdx;
};
struct SCamera
{
 vec3 Position;//точка расположения камеры
 vec3 View;//вектор "взгляда" или координаты точки, распологающейся в центре экрана
 vec3 Up;//"y" камеры
 vec3 Side;//"х" камеры
 vec2 Scale;//отношение сторон выходного изображения
};
struct SRay//первичный луч выходящий из камеры
{
 vec3 Origin;
 vec3 Direction;
};
struct SIntersection //структура для хранения пересечения.
{
float Time;
vec3 Point;
vec3 Normal;
vec3 Color;
vec4 LightCoeffs;
float ReflectionCoef;
float RefractionCoef;
int MaterialType;
};
struct SMaterial
{
vec3 Color;//diffuse color
vec4 LightCoeffs;//коэффициент фоновой освещенности
float ReflectionCoef;//отражение, 0 - non-reflection, 1 - mirror
float RefractionCoef;//преломление
int MaterialType;
};
struct SLight//точечный источник света
{
vec3 Position;
};
struct STracingRay
{
SRay ray;
float contribution;
int depth;
};

/*   GLOBAL VAR   */
SLight light;
STriangle triangles[12];
SSphere spheres[2];
SMaterial materials[6];
float Unit = 1;

SRay GenerateRay ( SCamera uCamera )
{
	vec2 coords = glPosition.xy * uCamera.Scale;
	vec3 direction = uCamera.View + uCamera.Side * coords.x + uCamera.Up * coords.y;
	return SRay ( uCamera.Position, normalize(direction) );//единичный луч направленный из . камеры в . glPosition
}
void initializeDefaultScene()
{
	/* left wall */
	triangles[0].v1 = vec3(-5.0,-5.0,-5.0);
	triangles[0].v2 = vec3(-5.0, 5.0, 5.0);
	triangles[0].v3 = vec3(-5.0, 5.0,-5.0);
	triangles[0].MaterialIdx = 0;
	triangles[1].v1 = vec3(-5.0,-5.0,-5.0);
	triangles[1].v2 = vec3(-5.0,-5.0, 5.0);
	triangles[1].v3 = vec3(-5.0, 5.0, 5.0);
	triangles[1].MaterialIdx = 0;

	triangles[2].v1 = vec3(-5.0,-5.0, 5.0);
	triangles[2].v2 = vec3( 5.0,-5.0, 5.0);
	triangles[2].v3 = vec3(-5.0, 5.0, 5.0);
	triangles[2].MaterialIdx = 2;
	triangles[3].v1 = vec3( 5.0, 5.0, 5.0);
	triangles[3].v2 = vec3(-5.0, 5.0, 5.0);
	triangles[3].v3 = vec3( 5.0,-5.0, 5.0);
	triangles[3].MaterialIdx = 2;
	
	/*right wall */ 
	triangles[4].v1 = vec3(5.0, 5.0, 5.0); 
	triangles[4].v2 = vec3(5.0, -5.0, 5.0); 
	triangles[4].v3 = vec3(5.0, 5.0, -5.0); 
	triangles[4].MaterialIdx = 3; 
	triangles[5].v1 = vec3(5.0, 5.0, -5.0); 
	triangles[5].v2 = vec3(5.0, -5.0, 5.0); 
	triangles[5].v3 = vec3(5.0, -5.0, -5.0); 
	triangles[5].MaterialIdx = 3; 

	/*down wall */ 
	triangles[6].v1 = vec3(-5.0,-5.0, 5.0); 
	triangles[6].v2 = vec3(-5.0,-5.0,-5.0); 
	triangles[6].v3 = vec3( 5.0,-5.0, 5.0); 
	triangles[6].MaterialIdx = 4; 
	triangles[7].v1 = vec3(5.0, -5.0, -5.0); 
	triangles[7].v2 = vec3(5.0,-5.0, 5.0); 
	triangles[7].v3 = vec3(-5.0,-5.0,-5.0); 
	triangles[7].MaterialIdx = 4; 

	/*up wall */ 
	triangles[8].v1 = vec3(-5.0, 5.0,-5.0); 
	triangles[8].v2 = vec3(-5.0, 5.0, 5.0); 
	triangles[8].v3 = vec3( 5.0, 5.0, 5.0); 
	triangles[8].MaterialIdx = 5; 
	triangles[9].v1 = vec3(-5.0, 5.0, -5.0); 
	triangles[9].v2 = vec3( 5.0, 5.0, 5.0); 
	triangles[9].v3 = vec3(5.0, 5.0, -5.0); 
	triangles[9].MaterialIdx = 5; 

	/*front wall*/ 
	triangles[10].v1 = vec3(-5.0,-5.0, -5.0); 
	triangles[10].v2 = vec3( 5.0,-5.0, -5.0); 
	triangles[10].v3 = vec3(-5.0, 5.0, -5.0); 
	triangles[10].MaterialIdx = 0; 
	triangles[11].v1 = vec3( 5.0, 5.0, -5.0); 
	triangles[11].v2 = vec3(-5.0, 5.0, -5.0); 
	triangles[11].v3 = vec3( 5.0,-5.0, -5.0); 
	triangles[11].MaterialIdx = 0; 

	spheres[0].Center = vec3(-1.0,-1.0,-2.0);
	spheres[0].Radius = 2.0;
	spheres[0].MaterialIdx = 1;
	spheres[1].Center = vec3(2.0,1.0,2.0);
	spheres[1].Radius = 1.0;
	spheres[1].MaterialIdx = 1;
}

bool IntersectSphere ( SSphere sphere, SRay ray, float start, float final, out float time )//пересечение со сферой, time точка пересечения
{
	ray.Origin -= sphere.Center;
	float A = dot ( ray.Direction, ray.Direction );//dot -скалярное произведение
	float B = dot ( ray.Direction, ray.Origin );
	float C = dot ( ray.Origin, ray.Origin ) - sphere.Radius * sphere.Radius;
	float D = B * B - A * C;//дискриминант

	if ( D > 0.0 )//2 точки пересечения
	{
		D = sqrt ( D );
		float t1 = ( -B - D ) / A;
		float t2 = ( -B + D ) / A;
		if(t1 < 0 && t2 < 0)//сфера позади нас
			return false;
		if (min(t1, t2) < 0)//мы внутри сферы
		{
			time = max(t1,t2);
			return true;
		}
		//мы снаружи
		time = min(t1, t2);
		return true;
	}
	return false;
}

//Барицентрический тест (fast minimal storage ray triangle intersection)
bool IntersectTriangle (SRay ray, vec3 v1, vec3 v2, vec3 v3, out float time )//пересечение с треуг
{
	time = -1;
	vec3 A = v2 - v1;
	vec3 B = v3 - v1;
	vec3 N = cross(A, B);//cross векторное произведение
	float NdotRayDirection = dot(N, ray.Direction);
	if (abs(NdotRayDirection) < 0.001)
		return false;
	float d = dot(N, v1);
	float t = -(dot(N, ray.Origin) - d) / NdotRayDirection;
	if (t < 0)
		return false;
	vec3 P = ray.Origin + t * ray.Direction;
	vec3 C;
	vec3 edge1 = v2 - v1;
	vec3 VP1 = P - v1;
	C = cross(edge1, VP1);
	if (dot(N, C) < 0)
		return false;
	vec3 edge2 = v3 - v2;
	vec3 VP2 = P - v2;
	C = cross(edge2, VP2);
	if (dot(N, C) < 0)
		return false;
	vec3 edge3 = v1 - v3;
	vec3 VP3 = P - v3;
	C = cross(edge3, VP3);
	if (dot(N, C) < 0)
		return false;
	time = t;
	return true;
}

//пересекает луч со всеми примитивами сцены и возвращает ближайшее пересечение
bool Raytrace ( SRay ray, float start, float final, inout SIntersection intersect )
{
	int numTriangles = 10;
	bool result = false;
	float test = start;
	intersect.Time = final;
	for(int i = 0; i < 2; i++)
	{
		SSphere sphere = spheres[i];
		if (IntersectSphere (sphere, ray, start, final, test ) && test < intersect.Time )
		{
			int numMat = spheres[i].MaterialIdx;
			intersect.Time = test;
			intersect.Point = ray.Origin + ray.Direction * test;
			intersect.Normal = normalize ( intersect.Point - spheres[i].Center );
			intersect.Color = materials[numMat].Color;
			intersect.LightCoeffs = materials[numMat].LightCoeffs;
			intersect.ReflectionCoef = materials[numMat].ReflectionCoef;
			intersect.RefractionCoef = materials[numMat].RefractionCoef;
			intersect.MaterialType =  1;
			result = true;
		}
	}
	for (int i = 0; i < numTriangles; i++)
	{
		STriangle triangle = triangles[i];
		if(IntersectTriangle(ray, triangle.v1, triangle.v2, triangle.v3, test) && test < intersect.Time)
		{
			int numMat = triangles[i].MaterialIdx;
			intersect.Time = test;
			intersect.Point = ray.Origin + ray.Direction * test;
			intersect.Normal = normalize(cross(triangle.v1 - triangle.v2, triangle.v3 - triangle.v2));
			intersect.Color = materials[numMat].Color;
			intersect.LightCoeffs = materials[numMat].LightCoeffs;
			intersect.ReflectionCoef = materials[numMat].ReflectionCoef;
			intersect.RefractionCoef = materials[numMat].RefractionCoef;
			intersect.MaterialType = 0;
			result = true;
		}
	}
	return result;
}
SCamera initializeDefaultCamera()

{	 SCamera camera;
	 camera.Position = vec3(0.0, 0.0, -8.0);
	 camera.View = vec3(0.0, 0.0, 1.0);
	 camera.Up = vec3(0.0, 1.0, 0.0);
	 camera.Side = vec3(1.0, 0.0, 0.0);
	 camera.Scale = vec2(1.0);
	 return camera;
}
void initializeDefaultLightMaterials(out SLight light)
{
//** LIGHT **//
light.Position = vec3(0.0, 2.0, -4.0f);
/** MATERIALS **/
vec4 lightCoefs = vec4(0.4,0.9,0.0,512.0);
materials[0].Color = vec3(0.0, 1.0, 0.0);
materials[0].LightCoeffs = vec4(lightCoefs);
materials[0].ReflectionCoef = 0.5;
materials[0].RefractionCoef = 1.0;
materials[0].MaterialType = DIFFUSE_REFLECTION;

materials[1].Color = vec3(0.0, 0.0, 1.0);//материал для шариков
materials[1].LightCoeffs = vec4(lightCoefs);
materials[1].ReflectionCoef = 0.5;
materials[1].RefractionCoef = 1.0;
materials[1].MaterialType = MIRROR_REFLECTION;

materials[2].Color = vec3(1.0, 0.0, 0.0);
materials[2].LightCoeffs = vec4(lightCoefs);
materials[2].ReflectionCoef = 0.5;
materials[2].RefractionCoef = 1.0;
materials[2].MaterialType = DIFFUSE_REFLECTION;

materials[3].Color = vec3(0.5, 0.5, 0.0);
materials[3].LightCoeffs = vec4(lightCoefs);
materials[3].ReflectionCoef = 0.5;
materials[3].RefractionCoef = 1.0;
materials[3].MaterialType = DIFFUSE_REFLECTION;

materials[4].Color = vec3(0.5, 0.0, 0.5);
materials[4].LightCoeffs = vec4(lightCoefs);
materials[4].ReflectionCoef = 0.5;
materials[4].RefractionCoef = 1.0;
materials[4].MaterialType = DIFFUSE_REFLECTION;

materials[5].Color = vec3(0.5, 0.5, 0.5);
materials[5].LightCoeffs = vec4(lightCoefs);
materials[5].ReflectionCoef = 0.5;
materials[5].RefractionCoef = 1.0;
materials[5].MaterialType = DIFFUSE_REFLECTION;
}
//модель освещения Фонга, расчет освещения из 3 компонент
//фоновой (ambient), рассеянной (diffuse) и глянцевых бликов (specular)
vec3 Phong ( SIntersection intersect, SLight currLight, float shadowing, SCamera uCamera)
{
	vec3 lightTmp = normalize ( currLight.Position - intersect.Point );
	float diffuse = max(dot(lightTmp, intersect.Normal), 0.0);//если lTmp параллелен поверхности, то res = 0
	vec3 view = normalize(uCamera.Position - intersect.Point);
	vec3 reflected = reflect( -view, intersect.Normal );//направление отражения для вектора падения
	float specular = pow(max(dot(reflected, lightTmp), 0.0), intersect.LightCoeffs.w);//зеркальная составляющая
	return intersect.LightCoeffs.x * intersect.Color +
 intersect.LightCoeffs.y * diffuse * intersect.Color * shadowing +
 intersect.LightCoeffs.z * specular * Unit;
}
float Shadow(SLight currLight, SIntersection intersect)
{
	// Point is lighted
	float shadowing = 1.0;
	// Vector to the light source
	vec3 direction = normalize(currLight.Position - intersect.Point);
	// Distance to the light source
	float distanceLight = distance(currLight.Position, intersect.Point);
	// Generation shadow ray for this light source
	SRay shadowRay = SRay(intersect.Point + direction * 0.001, direction);
	// ...test intersection this ray with each scene object
	SIntersection shadowIntersect;
	shadowIntersect.Time = 1000000.0;
	// trace ray from shadow ray begining to light source position
	if(Raytrace(shadowRay, 0, distanceLight,shadowIntersect))
	{
		// this light source is invisible in the intercection point
		shadowing = 0.0;
	}
	return shadowing;
}

struct Stack
{	
	int count;
	STracingRay ar[100];
};
Stack st;
bool isEmpty()
{
	return (st.count <= 0);
}
void push(STracingRay ray)
{
	st.ar[st.count] = ray;
	st.count++;
}
STracingRay pop()
{
	st.count--;
	return st.ar[st.count];
}
void main( void )
{
	st.count = 0 ;

	float start,final;
	SCamera uCamera = initializeDefaultCamera();
	SRay ray = GenerateRay(uCamera);
	vec3 resultColor = vec3(0,0,0);
	initializeDefaultScene();
	initializeDefaultLightMaterials(light);

	STracingRay trRay = STracingRay(ray, 1, 0);
	push(trRay);
	while(!isEmpty())
	{			
			STracingRay trRay = pop();
			ray = trRay.ray;
			SIntersection intersect;
			intersect.Time = 1000000.0;
			start = 0;
			final = 1000000.0;
			if (Raytrace(ray, start, final, intersect))
			{
				switch(intersect.MaterialType)
				{
					case DIFFUSE_REFLECTION:
					{
						float shadowing = Shadow(light, intersect);						
						resultColor += trRay.contribution * Phong ( intersect, light, shadowing, uCamera );
						break;
					}
					case MIRROR_REFLECTION:
					{
						if(intersect.ReflectionCoef < 1)
						{
							float contribution = trRay.contribution * (1 - intersect.ReflectionCoef);
							float shadowing = Shadow(light, intersect);												 
							resultColor += contribution * Phong(intersect, light, shadowing, uCamera);
						}
						vec3 reflectDirection = reflect(ray.Direction, intersect.Normal);
						// creare reflection ray
						float contribution = trRay.contribution * intersect.ReflectionCoef;
						STracingRay reflectRay = STracingRay(
						SRay(intersect.Point + reflectDirection * 0.001, reflectDirection),contribution, trRay.depth + 1);
						push(reflectRay);
						break;
					}
				} 
			} 
		}
		FragColor = vec4 (resultColor, 1.0);

	/*float start = 0;
	float final = 1000000.0;
	SCamera uCamera = initializeDefaultCamera();
	SRay ray = GenerateRay( uCamera);
	SIntersection intersect;
	intersect.Time = 1000000.0;
	vec3 resultColor = vec3(0,0,0);
	initializeDefaultScene();
	initializeDefaultLightMaterials(light);
	if (Raytrace(ray,  start, final, intersect))
	{
		float contribution = 1;
		float shadowing = Shadow(light, intersect);		
		//resultColor = vec3(1,0,0);
	    resultColor = vec3(1,0,0);
		resultColor += contribution * Phong (intersect, light, shadowing, uCamera );
	}
	FragColor = vec4 (resultColor, 1.0);*/
}