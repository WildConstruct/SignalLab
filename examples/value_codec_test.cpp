#include "signalrack/value_codec.h"
#include <cstdio>
#include <cmath>
using namespace ItsAllNoise::SignalRack;
int main(){
  int fails=0;
  double maxerr=0;
  for(int i=0;i<=1000;i++){
    float v=i/1000.0f;
    auto p=Pack24(v);
    float back=Unpack24(p[0],p[1],p[2]);
    maxerr=std::max(maxerr,(double)std::fabs(back-v));
  }
  printf("C++ 24-bit round-trip max err = %.3e\n", maxerr);
  if(maxerr > 1.0/kMax24 + 1e-7){ printf("FAIL precision\n"); fails++; }
  // parity spot-check vs JS (golden 0.6180339): JS gave precise to 1e-6
  float g=Unpack24(Pack24(0.6180339f)[0],Pack24(0.6180339f)[1],Pack24(0.6180339f)[2]);
  printf("golden 0.6180339 -> %.7f\n", g);
  if(std::fabs(g-0.6180339f)>1e-6){ printf("FAIL golden\n"); fails++; }
  // NormalizeForStrip: value 105 in [90,110] -> 0.75
  float n=NormalizeForStrip(105.f,90.f,110.f);
  printf("normalize(105,[90,110])=%.4f\n", n);
  if(std::fabs(n-0.75f)>1e-6){ printf("FAIL normalize\n"); fails++; }
  printf(fails? "CODEC FAIL\n":"CODEC OK (C++/JS parity)\n");
  return fails?1:0;
}
