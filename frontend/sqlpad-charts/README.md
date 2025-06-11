# helm charts for selekt

3 steps to use this chart

### First

clone git repository and change directory

```code
git clone https://github.com/selekt/selekt.git && cd selekt/selekt-charts
```

### Second

update dependency

```shell
helm dependency update
```

### Third

install this chart locally

```code
helm -n selekt install selekt ./
```

You should create namespace ahead or you can use flag `--create-namespace` to create namespace selekt
