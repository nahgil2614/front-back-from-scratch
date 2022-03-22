import numpy as np
import math

import plotly.graph_objects as go


H = 5  # Smoothing parameter


def sqrs(x):
    return (x ** 2).sum()


def k_gauss(x):
    return math.exp(-0.5 * sqrs(x)) / (2 * math.pi)


def get_z(x, y, f):
    m, n = x.shape
    z = np.empty((m, n))
    for i in range(m):
        for j in range(n):
            z[i, j] = f(x[i, j], y[i, j])
    return z


class Denclue2D(object):
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.n = len(x)
        assert(self.n == len(y))
        self.ps = [np.array([self.x[i], self.y[i]]) for i in range(self.n)]
        self.attrs = []
        self.bel = []
        self.is_out = []
        self.cluster_id = []

    def render_dens_fig(self):
        EPN = 75
        X = np.linspace(0, 100, EPN)
        Y = np.linspace(0, 100, EPN)
        Z = get_z(*np.meshgrid(X, Y), lambda x, y: self.f_gauss(np.array([x, y])))

        fig = go.Figure(data=[go.Surface(z=Z, x=X, y=Y)])
        fig.update_traces(contours_z=dict(show=True, usecolormap=True,
                                  highlightcolor="limegreen", project_z=True))
        
        # camera = dict(
        #     up=dict(x=0, y=0, z=1),
        #     center=dict(x=1, y=1, z=0),
        #     eye=dict(x=-0.25, y=-0.25, z=1.25)
        # )
        # fig.update_layout(scene_camera=camera)

        return fig.to_html(include_plotlyjs=False, full_html=False, default_width=600, default_height=600)

    def f_gauss(self, x):
        s = 0
        for p in self.ps:
            s += k_gauss((x - p) / H)
        return s / (self.n * (H ** 2))
